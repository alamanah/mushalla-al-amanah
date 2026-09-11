import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { AboutContent, InfaqInfo, KajianSchedule, PrayerOverride, SocialLink } from "../../types";

const TABS = ["kajian", "infaq", "sosmed", "tentang", "shalat"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  kajian: "Jadwal Kajian",
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
      {tab === "infaq" && <InfaqSettings />}
      {tab === "sosmed" && <SocialSettings />}
      {tab === "tentang" && <AboutSettings />}
      {tab === "shalat" && <PrayerOverrideSettings />}
    </div>
  );
}

function KajianSettings() {
  const [items, setItems] = useState<KajianSchedule[]>([]);
  const [form, setForm] = useState({
    title: "",
    ustadz: "",
    day_of_week: "5",
    time_text: "",
    location: "",
    description: "",
  });

  const load = () =>
    supabase
      .from("kajian_schedule")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as KajianSchedule[]) ?? []));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await supabase.from("kajian_schedule").insert({
      title: form.title,
      ustadz: form.ustadz || null,
      day_of_week: Number(form.day_of_week),
      time_text: form.time_text,
      location: form.location || null,
      description: form.description || null,
      is_active: true,
    });
    setForm({ title: "", ustadz: "", day_of_week: "5", time_text: "", location: "", description: "" });
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

  return (
    <div>
      <form onSubmit={submit} className="card grid sm:grid-cols-3 gap-3 mb-6">
        <div>
          <label className="label">Judul Kajian</label>
          <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Ustadz/Pemateri</label>
          <input className="input" value={form.ustadz} onChange={(e) => setForm({ ...form, ustadz: e.target.value })} />
        </div>
        <div>
          <label className="label">Hari</label>
          <select className="input" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}>
            {HARI.map((h, i) => (
              <option key={h} value={i}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Jam</label>
          <input
            required
            placeholder="Ba'da Maghrib"
            className="input"
            value={form.time_text}
            onChange={(e) => setForm({ ...form, time_text: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Lokasi</label>
          <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div>
          <label className="label">Deskripsi</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button className="btn-primary sm:col-span-3">Tambah Jadwal</button>
      </form>

      <div className="space-y-2">
        {items.map((k) => (
          <div key={k.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{k.title}</p>
              <p className="text-xs text-gray-500">
                {HARI[k.day_of_week ?? 0]} · {k.time_text} {k.ustadz ? `· ${k.ustadz}` : ""}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                className={`badge ${k.is_active ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}
                onClick={() => toggleActive(k.id, k.is_active)}
              >
                {k.is_active ? "Aktif" : "Nonaktif"}
              </button>
              <button className="text-red-500 text-xs" onClick={() => remove(k.id)}>
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
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
