import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "../context/AuthContext";
import { findLiveVideoId, isYoutubeLiveConfigured } from "./youtube";

const LIVE_POLL_MS = 20000; // jeda antar percobaan cek status live sesudah tombol "Mulai Live"
const LIVE_POLL_ATTEMPTS = 10; // ~3-4 menit percobaan otomatis sebelum berhenti
const BG_POLL_MS = 45000; // jeda cek berkala di jadwal hari ini yang belum live

export function todayStr() {
  // Pakai komponen tanggal LOKAL (bukan toISOString/UTC) supaya tidak salah
  // tanggal saat dini hari WITA (UTC+8) dibanding UTC.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** True kalau tanggal ("YYYY-MM-DD") sudah lewat dibanding hari ini --
 * dipakai untuk menonaktifkan tombol "Mulai Live" pada jadwal kajian
 * bertanggal spesifik & khutbah Jumat yang tanggalnya sudah lewat (jelas
 * tidak mungkin live untuk kegiatan yang sudah selesai). Perbandingan
 * string biasa sudah cukup karena formatnya "YYYY-MM-DD" (urut leksikal =
 * urut kronologis). `null` (kajian rutin mingguan tanpa tanggal spesifik,
 * yang berulang tiap minggu jadi tidak pernah "lewat") selalu dianggap
 * belum lewat. */
export function isPastDate(dateStr: string | null) {
  if (!dateStr) return false;
  return dateStr < todayStr();
}

interface LiveItemBase {
  id: string;
  live_video_id: string | null;
  is_active: boolean;
}

/** Logika "Mulai Live"/deteksi otomatis Live YouTube, dipakai bersama oleh
 * Dashboard > Pengaturan Konten > Jadwal Kajian & Jadwal Khatib Jumat, dan
 * halaman mobile Live -- generik lewat parameter `table` (nama tabel
 * Supabase) supaya fungsinya sama persis untuk Kajian maupun Khatib Jumat.
 * `getDate` mengambil field tanggal item (beda nama kolom antar tabel, mis.
 * "specific_date" di kajian_schedule vs "tanggal" di khatib_jumat_schedule). */
export function useKajianLive<T extends LiveItemBase>(
  table: string,
  items: T[],
  reload: () => void,
  getDate: (item: T) => string | null
) {
  const { user, profile } = useAuth();
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const pollTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Pantau berkala jadwal HARI INI yang belum ada live_video_id -- otomatis
  // terdeteksi begitu channel YouTube mulai live, tanpa perlu tempel link manual.
  useEffect(() => {
    if (!isYoutubeLiveConfigured()) return;
    const pending = items.filter((k) => getDate(k) === todayStr() && k.is_active && !k.live_video_id);
    if (pending.length === 0) return;
    const interval = setInterval(async () => {
      const videoId = await findLiveVideoId();
      if (videoId) {
        await Promise.all(pending.map((k) => supabase.from(table).update({ live_video_id: videoId }).eq("id", k.id)));
        reload();
      }
    }, BG_POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, table]);

  useEffect(() => {
    // Bersihkan semua timer polling manual saat komponen unmount.
    const timers = pollTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const stopPolling = (id: string) => {
    if (pollTimers.current[id]) {
      clearTimeout(pollTimers.current[id]);
      delete pollTimers.current[id];
    }
    setPollingIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  };

  const pollAttempt = (id: string, attemptsLeft: number) => {
    findLiveVideoId().then(async (videoId) => {
      if (videoId) {
        await supabase.from(table).update({ live_video_id: videoId }).eq("id", id);
        stopPolling(id);
        reload();
        return;
      }
      if (attemptsLeft <= 1) {
        stopPolling(id);
        return;
      }
      pollTimers.current[id] = setTimeout(() => pollAttempt(id, attemptsLeft - 1), LIVE_POLL_MS);
    });
  };

  const startLive = async (k: T) => {
    window.open("https://studio.youtube.com/live?action=create", "_blank", "noopener");
    await supabase
      .from(table)
      .update({
        live_by_name: profile?.full_name ?? user?.email ?? "Humas",
        live_started_at: new Date().toISOString(),
      })
      .eq("id", k.id);
    reload();
    if (isYoutubeLiveConfigured()) {
      setPollingIds((s) => new Set(s).add(k.id));
      pollAttempt(k.id, LIVE_POLL_ATTEMPTS);
    }
  };

  const checkLiveNow = (k: T) => {
    setPollingIds((s) => new Set(s).add(k.id));
    pollAttempt(k.id, 1);
  };

  const endLive = async (k: T) => {
    await supabase.from(table).update({ live_video_id: null }).eq("id", k.id);
    reload();
  };

  return { pollingIds, startLive, checkLiveNow, endLive };
}
