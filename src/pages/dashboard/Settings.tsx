import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchHijriDate, fetchHijriMap, fetchPrayerTimes, PrayerTimesResult } from "../../lib/prayerTimes";
import { isYoutubeLiveConfigured } from "../../lib/youtube";
import { isPamfletUploadConfigured } from "../../lib/pamfletUpload";
import { todayStr, useKajianLive } from "../../lib/useKajianLive";
import { driveImageUrl } from "../../lib/driveLink";
import UploadPamfletButton from "../../components/UploadPamfletButton";
import IconButton from "../../components/IconButton";
import {
  IconCheckBadge,
  IconClock,
  IconEye,
  IconEyeOff,
  IconImage,
  IconLiveDot,
  IconRefresh,
  IconStop,
  IconTrash,
  IconYoutube,
} from "../../components/icons";
import {
  AboutContent,
  InfaqInfo,
  KajianSchedule,
  KhatibJumatSchedule,
  PrayerOverride,
  SocialLink,
  Ustadz,
} from "../../types";

const TABS = ["kajian", "khatib", "infaq", "sosmed", "tentang", "shalat"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  kajian: "Jadwal Kajian",
  khatib: "Jadwal Khatib Jumat",
  infaq: "Info Infaq",
  sosmed: "Media Sosial",
  tentang: "Tentang Mushalla",
  shalat: "Override Jadwal Shalat",
};

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function Settings() {
  const [tab, setTab] = useState<Tab>("kajian");

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary-900 mb-6">Pengaturan Konten</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`badge border ${
              tab === t ? "bg-primary-700 text-white border-primary-700" : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      {tab === "kajian" && <KajianSettings />}
      {tab === "khatib" && <KhatibJumatSettings />}
      {tab === "infaq" && <InfaqSettings />}
      {tab === "sosmed" && <SocialSettings />}
      {tab === "tentang" && <AboutSettings />}
      {tab === "shalat" && <PrayerOverrideSettings />}
    </div>
  );
}

const DEFAULT_LOKASI = "Mushalla Al Amanah GKN I Denpasar";

function formatTanggalPanjang(tgl: string) {
  const [y, m, d] = tgl.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

/** Tentukan label jam otomatis: kalau jam yang dipilih ada dalam rentang toleransi
 * sesudah Dzuhur/Maghrib pada tanggal terkait, pakai label "Ba'da ...", kalau tidak
 * pakai format jam biasa. Pengurus tetap bisa menyunting hasilnya secara manual. */
function resolveWaktuLabel(jam: string, prayer: PrayerTimesResult | null): string {
  if (!jam) return "";
  if (!prayer) return `Pukul ${jam.replace(":", ".")} WITA`;
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const jamMin = toMinutes(jam);
  const WINDOW = 90;
  if (jamMin >= toMinutes(prayer.dzuhur) && jamMin - toMinutes(prayer.dzuhur) <= WINDOW) return "Ba'da Dzuhur";
  if (jamMin >= toMinutes(prayer.maghrib) && jamMin - toMinutes(prayer.maghrib) <= WINDOW) return "Ba'da Maghrib";
  return `Pukul ${jam.replace(":", ".")} WITA`;
}

const emptyKajianForm = {
  title: "",
  ustadz: "",
  ustadzCustom: "",
  tanggal: "",
  jam: "",
  time_text: "",
  location: DEFAULT_LOKASI,
  description: "",
  foto_url: "",
  link_youtube: "",
};

function KajianSettings() {
  const [items, setItems] = useState<KajianSchedule[]>([]);
  const [ustadzList, setUstadzList] = useState<Ustadz[]>([]);
  const [form, setForm] = useState(emptyKajianForm);
  const [prayerForTanggal, setPrayerForTanggal] = useState<PrayerTimesResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [photoItem, setPhotoItem] = useState<KajianSchedule | null>(null);
  const [photoLinkInput, setPhotoLinkInput] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);

  const [ytItem, setYtItem] = useState<KajianSchedule | null>(null);
  const [ytLinkInput, setYtLinkInput] = useState("");
  const [ytSaving, setYtSaving] = useState(false);

  const load = () =>
    supabase
      .from("kajian_schedule")
      .select("*")
      .order("specific_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as KajianSchedule[]) ?? []));

  useEffect(() => {
    load();
    supabase
      .from("ustadz")
      .select("*")
      .order("nama", { ascending: true })
      .then(({ data }) => setUstadzList((data as Ustadz[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preview Hari & Tanggal Hijriah + ambil jam Dzuhur/Maghrib tanggal terkait
  // (dipakai untuk auto-label "Ba'da ..." saat memilih Jam).
  useEffect(() => {
    if (!form.tanggal) {
      setPrayerForTanggal(null);
      return;
    }
    setPreviewLoading(true);
    const [y, m, d] = form.tanggal.split("-").map(Number);
    fetchPrayerTimes(new Date(y, m - 1, d))
      .then((res) => setPrayerForTanggal(res))
      .catch(() => setPrayerForTanggal(null))
      .finally(() => setPreviewLoading(false));
  }, [form.tanggal]);

  // Auto-sinkron label Jam begitu jam dipilih (atau tanggal berubah setelah jam terisi).
  useEffect(() => {
    if (!form.jam) return;
    setForm((f) => ({ ...f, time_text: resolveWaktuLabel(f.jam, prayerForTanggal) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.jam, prayerForTanggal]);

  const { pollingIds, startLive, checkLiveNow, endLive } = useKajianLive(
    "kajian_schedule",
    items,
    load,
    (k) => k.specific_date
  );

  const resetForm = () => setForm(emptyKajianForm);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.tanggal) return;
    setSaving(true);
    const ustadzValue = form.ustadz === "__custom__" ? form.ustadzCustom.trim() || null : form.ustadz || null;
    await supabase.from("kajian_schedule").insert({
      title: form.title,
      ustadz: ustadzValue,
      day_of_week: null,
      specific_date: form.tanggal,
      time_text: form.time_text || "Ba'da Maghrib",
      location: form.location || DEFAULT_LOKASI,
      description: form.description || null,
      foto_url: form.foto_url.trim() || null,
      link_youtube: form.link_youtube.trim() || null,
      is_active: true,
    });
    setSaving(false);
    resetForm();
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("kajian_schedule").update({ is_active: !active }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("kajian_schedule").delete().eq("id", id);
    load();
  };

  // ---- Link pamflet (Google Drive) ----
  // Sesuai permintaan: pamflet TIDAK diunggah ke Supabase Storage, cukup
  // unggah manual ke Google Drive lalu tempel link-nya di sini.
  const openPhoto = (k: KajianSchedule) => {
    setPhotoItem(k);
    setPhotoLinkInput(k.foto_url ?? "");
  };
  const closePhoto = () => {
    setPhotoItem(null);
    setPhotoLinkInput("");
  };
  const savePhotoLink = async () => {
    if (!photoItem) return;
    setPhotoSaving(true);
    await supabase.from("kajian_schedule").update({ foto_url: photoLinkInput.trim() || null }).eq("id", photoItem.id);
    setPhotoSaving(false);
    closePhoto();
    load();
  };

  // ---- Link YouTube manual (di luar deteksi live otomatis) ----
  const openYt = (k: KajianSchedule) => {
    setYtItem(k);
    setYtLinkInput(k.link_youtube ?? "");
  };
  const closeYt = () => {
    setYtItem(null);
    setYtLinkInput("");
  };
  const saveYtLink = async () => {
    if (!ytItem) return;
    setYtSaving(true);
    await supabase.from("kajian_schedule").update({ link_youtube: ytLinkInput.trim() || null }).eq("id", ytItem.id);
    setYtSaving(false);
    closeYt();
    load();
  };

  const formatJamLog = (t: string | null) => {
    if (!t) return "-";
    return new Date(t).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      <form onSubmit={submit} className="card grid sm:grid-cols-3 gap-3 mb-6">
        <h2 className="sm:col-span-3 font-semibold text-gray-800">Tambah Jadwal Kajian</h2>
        <div>
          <label className="label">Judul Kajian</label>
          <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <div>
          <label className="label">Ustadz/Pemateri</label>
          <select
            className="input"
            value={form.ustadz}
            onChange={(e) => setForm({ ...form, ustadz: e.target.value })}
          >
            <option value="">- Pilih Ustadz -</option>
            {ustadzList.map((u) => (
              <option key={u.id} value={u.nama}>
                {u.nama}
              </option>
            ))}
            <option value="__custom__">+ Lainnya (ketik manual)</option>
          </select>
          {form.ustadz === "__custom__" && (
            <input
              className="input mt-2"
              placeholder="Nama ustadz/pemateri"
              value={form.ustadzCustom}
              onChange={(e) => setForm({ ...form, ustadzCustom: e.target.value })}
            />
          )}
        </div>

        <div>
          <label className="label">Tanggal</label>
          <input
            type="date"
            required
            className="input"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
          />
          {form.tanggal && (
            <p className="text-xs text-gray-500 mt-1">
              {formatTanggalPanjang(form.tanggal)}
              {previewLoading && " · memuat tanggal Hijriah..."}
              {!previewLoading && prayerForTanggal?.hijri && ` · ${prayerForTanggal.hijri}`}
            </p>
          )}
        </div>

        <div>
          <label className="label">Jam</label>
          <input
            type="time"
            required
            className="input"
            value={form.jam}
            onChange={(e) => setForm({ ...form, jam: e.target.value })}
          />
          {form.tanggal && !prayerForTanggal && !previewLoading && (
            <p className="text-xs text-yellow-600 mt-1">Gagal memuat jadwal shalat untuk sinkron otomatis.</p>
          )}
        </div>

        <div>
          <label className="label">Keterangan Jam (otomatis, bisa diubah)</label>
          <input
            className="input"
            required
            value={form.time_text}
            onChange={(e) => setForm({ ...form, time_text: e.target.value })}
            placeholder="Ba'da Maghrib"
          />
        </div>

        <div>
          <label className="label">Lokasi</label>
          <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Deskripsi</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div>
          <label className="label">Pamflet (opsional)</label>
          <div className="flex flex-wrap items-center gap-2">
            <UploadPamfletButton onUploaded={(link) => setForm((f) => ({ ...f, foto_url: link }))} />
            {isPamfletUploadConfigured() && <span className="text-[11px] text-gray-400">atau tempel link manual:</span>}
          </div>
          <input
            className="input mt-2"
            placeholder="https://drive.google.com/file/d/..."
            value={form.foto_url}
            onChange={(e) => setForm({ ...form, foto_url: e.target.value })}
          />
          {!isPamfletUploadConfigured() && (
            <p className="text-[11px] text-gray-400 mt-1">
              Unggah gambar ke Google Drive, atur akses "Siapa saja yang memiliki link", lalu tempel link-nya di
              sini.
            </p>
          )}
        </div>

        <div>
          <label className="label">Link YouTube (opsional)</label>
          <input
            className="input"
            placeholder="https://youtube.com/..."
            value={form.link_youtube}
            onChange={(e) => setForm({ ...form, link_youtube: e.target.value })}
          />
        </div>

        <button className="btn-primary sm:col-span-3" disabled={saving}>
          {saving ? "Menyimpan..." : "Tambah Jadwal"}
        </button>
      </form>

      {!isYoutubeLiveConfigured() && (
        <p className="text-xs text-yellow-600 mb-4">
          Deteksi otomatis Live YouTube belum aktif (lihat supabase/SETUP.md bagian "Live YouTube otomatis"). Tombol
          "Mulai Live" tetap bisa dipakai untuk membuka YouTube Studio.
        </p>
      )}

      <div className="space-y-2">
        {items.map((k) => {
          const isToday = k.specific_date === todayStr();
          const isPolling = pollingIds.has(k.id);
          return (
            <div key={k.id} className="card">
              <div className="flex items-start gap-3">
                {k.foto_url && (
                  <img
                    src={driveImageUrl(k.foto_url) ?? undefined}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover border border-gray-100 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{k.title}</p>
                    {k.live_video_id && <span className="badge bg-red-100 text-red-700">🔴 LIVE</span>}
                    {isToday && <span className="badge bg-gold-500/20 text-gold-700">Hari ini</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {k.specific_date ? formatTanggalPanjang(k.specific_date) : k.day_of_week !== null ? HARI[k.day_of_week] : ""}{" "}
                    · {k.time_text} {k.ustadz ? `· ${k.ustadz}` : ""} {k.location ? `· ${k.location}` : ""}
                  </p>
                  {k.live_by_name && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Live terakhir dimulai oleh {k.live_by_name}, {formatJamLog(k.live_started_at)}
                    </p>
                  )}
                  {k.link_youtube && (
                    <a
                      href={k.link_youtube}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary-700 hover:underline inline-block mt-0.5"
                    >
                      Link YouTube
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 items-center shrink-0">
                  <IconButton
                    label={k.is_active ? "Aktif (klik untuk nonaktifkan)" : "Nonaktif (klik untuk aktifkan)"}
                    variant={k.is_active ? "active" : "muted"}
                    onClick={() => toggleActive(k.id, k.is_active)}
                  >
                    {k.is_active ? <IconEye className="h-4 w-4" /> : <IconEyeOff className="h-4 w-4" />}
                  </IconButton>
                  <IconButton label={k.foto_url ? "Ganti Link Pamflet" : "Tambah Link Pamflet"} onClick={() => openPhoto(k)}>
                    <IconImage className="h-4 w-4" />
                  </IconButton>
                  <IconButton label={k.link_youtube ? "Ganti Link YouTube" : "Tambah Link YouTube"} onClick={() => openYt(k)}>
                    <IconYoutube className="h-4 w-4" />
                  </IconButton>
                  {k.live_video_id ? (
                    <IconButton label="Akhiri Live" variant="live" onClick={() => endLive(k)}>
                      <IconStop className="h-4 w-4" />
                    </IconButton>
                  ) : (
                    <IconButton label="Mulai Live" variant="live" onClick={() => startLive(k)}>
                      <IconLiveDot className="h-4 w-4" />
                    </IconButton>
                  )}
                  {isYoutubeLiveConfigured() && !k.live_video_id && (
                    <IconButton label="Cek Status Live" onClick={() => checkLiveNow(k)} disabled={isPolling}>
                      <IconRefresh className={`h-4 w-4 ${isPolling ? "animate-spin" : ""}`} />
                    </IconButton>
                  )}
                  <IconButton label="Hapus Jadwal" variant="danger" onClick={() => remove(k.id)}>
                    <IconTrash className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ytItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-sm w-full">
            <h3 className="font-semibold text-gray-800 mb-1">{ytItem.title}</h3>
            <p className="text-xs text-gray-500 mb-3">
              Link YouTube manual (opsional) -- di luar deteksi live otomatis, mis. link premiere/rekaman terjadwal.
            </p>
            <input
              className="input"
              placeholder="https://youtube.com/..."
              value={ytLinkInput}
              onChange={(e) => setYtLinkInput(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <button className="btn-primary flex-1" disabled={ytSaving} onClick={saveYtLink}>
                {ytSaving ? "Menyimpan..." : "Simpan Link"}
              </button>
              <button className="btn-secondary" onClick={closeYt}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {photoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-sm w-full">
            <h3 className="font-semibold text-gray-800 mb-1">{photoItem.title}</h3>
            <p className="text-xs text-gray-500 mb-3">Gambar pamflet ini akan tampil di beranda pada jadwal kajian ini.</p>
            <div className="mb-2">
              <UploadPamfletButton onUploaded={(link) => setPhotoLinkInput(link)} />
            </div>
            {driveImageUrl(photoLinkInput) && (
              <img src={driveImageUrl(photoLinkInput)!} alt="" className="w-full rounded-lg mb-3 border border-gray-100" />
            )}
            {isPamfletUploadConfigured() && <p className="text-[11px] text-gray-400 mb-1">atau tempel link manual:</p>}
            <input
              className="input"
              placeholder="https://drive.google.com/file/d/..."
              value={photoLinkInput}
              onChange={(e) => setPhotoLinkInput(e.target.value)}
            />
            {!isPamfletUploadConfigured() && (
              <p className="text-[11px] text-gray-400 mt-1">
                Unggah gambar ke Google Drive, atur akses "Siapa saja yang memiliki link", lalu tempel link-nya di sini.
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <button className="btn-primary flex-1" disabled={photoSaving} onClick={savePhotoLink}>
                {photoSaving ? "Menyimpan..." : "Simpan Link"}
              </button>
              <button className="btn-secondary" onClick={closePhoto}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const emptyKhatibForm = {
  ustadz: "",
  ustadzCustom: "",
  tanggal: "",
  link_youtube: "",
};

function KhatibJumatSettings() {
  const [items, setItems] = useState<KhatibJumatSchedule[]>([]);
  const [ustadzList, setUstadzList] = useState<Ustadz[]>([]);
  const [form, setForm] = useState(emptyKhatibForm);
  const [saving, setSaving] = useState(false);
  const [hijriMap, setHijriMap] = useState<Record<string, string | null>>({});
  const [hijriFormPreview, setHijriFormPreview] = useState<string | null>(null);

  const [ytItem, setYtItem] = useState<KhatibJumatSchedule | null>(null);
  const [ytLinkInput, setYtLinkInput] = useState("");
  const [ytSaving, setYtSaving] = useState(false);

  const load = () =>
    supabase
      .from("khatib_jumat_schedule")
      .select("*")
      .order("tanggal", { ascending: false })
      .then(({ data }) => setItems((data as KhatibJumatSchedule[]) ?? []));

  useEffect(() => {
    load();
    supabase
      .from("ustadz")
      .select("*")
      .order("nama", { ascending: true })
      .then(({ data }) => setUstadzList((data as Ustadz[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tanggal Hijriah tiap jadwal yang sudah ada -- diambil sekaligus (batch),
  // bukan satu-satu per baris.
  useEffect(() => {
    fetchHijriMap(items.map((k) => k.tanggal)).then(setHijriMap);
  }, [items]);

  // Preview tanggal Hijriah saat memilih Tanggal Khutbah di form tambah.
  useEffect(() => {
    if (!form.tanggal) {
      setHijriFormPreview(null);
      return;
    }
    let alive = true;
    const [y, m, d] = form.tanggal.split("-").map(Number);
    fetchHijriDate(new Date(y, m - 1, d)).then((h) => {
      if (alive) setHijriFormPreview(h);
    });
    return () => {
      alive = false;
    };
  }, [form.tanggal]);

  const { pollingIds, startLive, checkLiveNow, endLive } = useKajianLive(
    "khatib_jumat_schedule",
    items,
    load,
    (k) => k.tanggal
  );

  const resetForm = () => setForm(emptyKhatibForm);

  const namaUstadzInput = form.ustadz === "__custom__" ? form.ustadzCustom.trim() : form.ustadz;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.tanggal || !namaUstadzInput) return;
    setSaving(true);
    await supabase.from("khatib_jumat_schedule").insert({
      tanggal: form.tanggal,
      nama_ustadz: namaUstadzInput,
      link_youtube: form.link_youtube.trim() || null,
      is_active: true,
    });
    setSaving(false);
    resetForm();
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("khatib_jumat_schedule").update({ is_active: !active }).eq("id", id);
    load();
  };

  // Status konfirmasi kehadiran khatib -- default "Belum Dikonfirmasi" saat
  // jadwal dibuat, diklik humas untuk menandai "Terkonfirmasi" setelah
  // khatib bersangkutan memastikan kehadirannya.
  const toggleConfirmed = async (id: string, confirmed: boolean) => {
    await supabase.from("khatib_jumat_schedule").update({ is_confirmed: !confirmed }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("khatib_jumat_schedule").delete().eq("id", id);
    load();
  };

  // ---- Link YouTube manual (bisa diubah lagi setelah jadwal dibuat) ----
  const openYt = (k: KhatibJumatSchedule) => {
    setYtItem(k);
    setYtLinkInput(k.link_youtube ?? "");
  };
  const closeYt = () => {
    setYtItem(null);
    setYtLinkInput("");
  };
  const saveYtLink = async () => {
    if (!ytItem) return;
    setYtSaving(true);
    await supabase.from("khatib_jumat_schedule").update({ link_youtube: ytLinkInput.trim() || null }).eq("id", ytItem.id);
    setYtSaving(false);
    closeYt();
    load();
  };

  const formatJamLog = (t: string | null) => {
    if (!t) return "-";
    return new Date(t).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      <form onSubmit={submit} className="card grid sm:grid-cols-3 gap-3 mb-6">
        <h2 className="sm:col-span-3 font-semibold text-gray-800">Tambah Jadwal Khatib Jumat</h2>
        <div>
          <label className="label">Nama Ustadz/Khatib</label>
          <select className="input" value={form.ustadz} onChange={(e) => setForm({ ...form, ustadz: e.target.value })}>
            <option value="">- Pilih Ustadz -</option>
            {ustadzList.map((u) => (
              <option key={u.id} value={u.nama}>
                {u.nama}
              </option>
            ))}
            <option value="__custom__">+ Lainnya (ketik manual)</option>
          </select>
          {form.ustadz === "__custom__" && (
            <input
              className="input mt-2"
              placeholder="Nama ustadz/khatib"
              value={form.ustadzCustom}
              onChange={(e) => setForm({ ...form, ustadzCustom: e.target.value })}
            />
          )}
        </div>

        <div>
          <label className="label">Tanggal Khutbah (Jumat)</label>
          <input
            type="date"
            required
            className="input"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
          />
          {form.tanggal && (
            <p className="text-xs text-gray-500 mt-1">
              {formatTanggalPanjang(form.tanggal)}
              {hijriFormPreview && ` · ${hijriFormPreview}`}
            </p>
          )}
        </div>

        <div>
          <label className="label">Link YouTube (opsional)</label>
          <input
            className="input"
            placeholder="https://youtube.com/..."
            value={form.link_youtube}
            onChange={(e) => setForm({ ...form, link_youtube: e.target.value })}
          />
        </div>

        <button className="btn-primary sm:col-span-3" disabled={saving || !namaUstadzInput}>
          {saving ? "Menyimpan..." : "Tambah Jadwal"}
        </button>
      </form>

      {!isYoutubeLiveConfigured() && (
        <p className="text-xs text-yellow-600 mb-4">
          Deteksi otomatis Live YouTube belum aktif (lihat supabase/SETUP.md bagian "Live YouTube otomatis"). Tombol
          "Mulai Live" tetap bisa dipakai untuk membuka YouTube Studio.
        </p>
      )}

      <div className="space-y-2">
        {items.map((k) => {
          const isToday = k.tanggal === todayStr();
          const isPolling = pollingIds.has(k.id);
          return (
            <div key={k.id} className="card">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{k.nama_ustadz}</p>
                    {k.live_video_id && <span className="badge bg-red-100 text-red-700">🔴 LIVE</span>}
                    {isToday && <span className="badge bg-gold-500/20 text-gold-700">Hari ini</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatTanggalPanjang(k.tanggal)}
                    {hijriMap[k.tanggal] && ` · ${hijriMap[k.tanggal]}`}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <IconButton
                      label={k.is_confirmed ? "Terkonfirmasi (klik untuk batalkan)" : "Belum Dikonfirmasi (klik untuk tandai)"}
                      variant={k.is_confirmed ? "active" : "muted"}
                      onClick={() => toggleConfirmed(k.id, k.is_confirmed)}
                      className="!h-6 !w-6"
                    >
                      {k.is_confirmed ? <IconCheckBadge className="h-3.5 w-3.5" /> : <IconClock className="h-3.5 w-3.5" />}
                    </IconButton>
                    {k.link_youtube && (
                      <a
                        href={k.link_youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary-700 hover:underline"
                      >
                        Link YouTube
                      </a>
                    )}
                  </div>
                  {k.live_by_name && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Live terakhir dimulai oleh {k.live_by_name}, {formatJamLog(k.live_started_at)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 items-center shrink-0">
                  <IconButton
                    label={k.is_active ? "Aktif (klik untuk nonaktifkan)" : "Nonaktif (klik untuk aktifkan)"}
                    variant={k.is_active ? "active" : "muted"}
                    onClick={() => toggleActive(k.id, k.is_active)}
                  >
                    {k.is_active ? <IconEye className="h-4 w-4" /> : <IconEyeOff className="h-4 w-4" />}
                  </IconButton>
                  <IconButton label={k.link_youtube ? "Ganti Link YouTube" : "Tambah Link YouTube"} onClick={() => openYt(k)}>
                    <IconYoutube className="h-4 w-4" />
                  </IconButton>
                  {k.live_video_id ? (
                    <IconButton label="Akhiri Live" variant="live" onClick={() => endLive(k)}>
                      <IconStop className="h-4 w-4" />
                    </IconButton>
                  ) : (
                    <IconButton label="Mulai Live" variant="live" onClick={() => startLive(k)}>
                      <IconLiveDot className="h-4 w-4" />
                    </IconButton>
                  )}
                  {isYoutubeLiveConfigured() && !k.live_video_id && (
                    <IconButton label="Cek Status Live" onClick={() => checkLiveNow(k)} disabled={isPolling}>
                      <IconRefresh className={`h-4 w-4 ${isPolling ? "animate-spin" : ""}`} />
                    </IconButton>
                  )}
                  <IconButton label="Hapus Jadwal" variant="danger" onClick={() => remove(k.id)}>
                    <IconTrash className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ytItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card max-w-sm w-full">
            <h3 className="font-semibold text-gray-800 mb-1">{ytItem.nama_ustadz}</h3>
            <p className="text-xs text-gray-500 mb-3">Link YouTube (opsional) untuk jadwal khatib Jumat ini.</p>
            <input
              className="input"
              placeholder="https://youtube.com/..."
              value={ytLinkInput}
              onChange={(e) => setYtLinkInput(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <button className="btn-primary flex-1" disabled={ytSaving} onClick={saveYtLink}>
                {ytSaving ? "Menyimpan..." : "Simpan Link"}
              </button>
              <button className="btn-secondary" onClick={closeYt}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfaqSettings() {
  const [form, setForm] = useState<Partial<InfaqInfo>>({});
  const [id, setId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("infaq_info")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm(data as InfaqInfo);
          setId((data as InfaqInfo).id);
        }
      });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    if (id) {
      await supabase.from("infaq_info").update(form).eq("id", id);
    } else {
      const { data } = await supabase.from("infaq_info").insert(form).select().maybeSingle();
      if (data) setId((data as InfaqInfo).id);
    }
    setSaved(true);
  };

  return (
    <form onSubmit={submit} className="card grid sm:grid-cols-2 gap-3 max-w-2xl">
      <div className="sm:col-span-2">
        <label className="label">Deskripsi</label>
        <input
          className="input"
          value={form.description ?? ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Nama Bank</label>
        <input className="input" value={form.bank_name ?? ""} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
      </div>
      <div>
        <label className="label">Nomor Rekening</label>
        <input
          className="input"
          value={form.account_number ?? ""}
          onChange={(e) => setForm({ ...form, account_number: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Atas Nama</label>
        <input
          className="input"
          value={form.account_holder ?? ""}
          onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Nama E-Wallet (mis. DANA/OVO)</label>
        <input
          className="input"
          value={form.ewallet_name ?? ""}
          onChange={(e) => setForm({ ...form, ewallet_name: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Nomor E-Wallet</label>
        <input
          className="input"
          value={form.ewallet_number ?? ""}
          onChange={(e) => setForm({ ...form, ewallet_number: e.target.value })}
        />
      </div>
      <div>
        <label className="label">URL Gambar QRIS</label>
        <input
          className="input"
          value={form.qr_image_url ?? ""}
          onChange={(e) => setForm({ ...form, qr_image_url: e.target.value })}
        />
      </div>
      <button className="btn-primary sm:col-span-2">Simpan</button>
      {saved && <p className="text-sm text-primary-700 sm:col-span-2">Tersimpan.</p>}
    </form>
  );
}

function SocialSettings() {
  const [items, setItems] = useState<SocialLink[]>([]);
  const [form, setForm] = useState({ platform: "", url: "" });

  const load = () =>
    supabase
      .from("social_links")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setItems((data as SocialLink[]) ?? []));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await supabase.from("social_links").insert({ platform: form.platform, url: form.url, is_active: true, sort_order: items.length });
    setForm({ platform: "", url: "" });
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("social_links").update({ is_active: !active }).eq("id", id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("social_links").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <form onSubmit={submit} className="card flex flex-wrap gap-3 items-end mb-6">
        <div>
          <label className="label">Platform</label>
          <input
            required
            placeholder="Instagram"
            className="input"
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label">URL</label>
          <input
            required
            placeholder="https://instagram.com/..."
            className="input"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
        </div>
        <button className="btn-primary">Tambah</button>
      </form>
      <div className="space-y-2">
        {items.map((l) => (
          <div key={l.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{l.platform}</p>
              <p className="text-xs text-gray-500">{l.url}</p>
            </div>
            <div className="flex gap-2">
              <button
                className={`badge ${l.is_active ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}
                onClick={() => toggleActive(l.id, l.is_active)}
              >
                {l.is_active ? "Aktif" : "Nonaktif"}
              </button>
              <button className="text-red-500 text-xs" onClick={() => remove(l.id)}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutSettings() {
  const [content, setContent] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("about_content")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setContent((data as AboutContent).content);
          setId((data as AboutContent).id);
        }
      });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    if (id) {
      await supabase.from("about_content").update({ content }).eq("id", id);
    } else {
      const { data } = await supabase.from("about_content").insert({ content }).select().maybeSingle();
      if (data) setId((data as AboutContent).id);
    }
    setSaved(true);
  };

  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-3">
      <label className="label">Konten "Tentang Mushalla"</label>
      <textarea rows={12} className="input" value={content} onChange={(e) => setContent(e.target.value)} />
      <button className="btn-primary">Simpan</button>
      {saved && <p className="text-sm text-primary-700">Tersimpan.</p>}
    </form>
  );
}

function PrayerOverrideSettings() {
  const [items, setItems] = useState<PrayerOverride[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    subuh: "",
    dzuhur: "",
    ashar: "",
    maghrib: "",
    isya: "",
    jumat: "",
    note: "",
  });

  const load = () =>
    supabase
      .from("prayer_schedule_override")
      .select("*")
      .order("date", { ascending: false })
      .then(({ data }) => setItems((data as PrayerOverride[]) ?? []));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await supabase.from("prayer_schedule_override").upsert(
      {
        date: form.date,
        subuh: form.subuh || null,
        dzuhur: form.dzuhur || null,
        ashar: form.ashar || null,
        maghrib: form.maghrib || null,
        isya: form.isya || null,
        jumat: form.jumat || null,
        note: form.note || null,
      },
      { onConflict: "date" }
    );
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("prayer_schedule_override").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Gunakan ini untuk mengoreksi jadwal shalat pada tanggal tertentu (misalnya jadwal Jumat atau
        koreksi lokal), menimpa hasil perhitungan otomatis pada tanggal tersebut.
      </p>
      <form onSubmit={submit} className="card grid sm:grid-cols-4 gap-3 mb-6">
        <div>
          <label className="label">Tanggal</label>
          <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        {(["subuh", "dzuhur", "ashar", "maghrib", "isya", "jumat"] as const).map((f) => (
          <div key={f}>
            <label className="label capitalize">{f}</label>
            <input
              className="input"
              placeholder="HH:MM"
              value={(form as any)[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
            />
          </div>
        ))}
        <div className="sm:col-span-4">
          <label className="label">Catatan</label>
          <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <button className="btn-primary sm:col-span-4">Simpan Override</button>
      </form>
      <div className="space-y-2">
        {items.map((o) => (
          <div key={o.id} className="card flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium">{o.date}</p>
              <p className="text-xs text-gray-500">{o.note}</p>
            </div>
            <button className="text-red-500 text-xs" onClick={() => remove(o.id)}>
              Hapus
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
