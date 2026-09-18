export type UserStatus = "pending" | "approved" | "rejected";
export type AppRole = "admin" | "bendahara" | "inventaris" | "humas";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  bendahara: "Bendahara",
  inventaris: "Operator Inventaris",
  humas: "Humas",
};

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
}

export interface KajianSchedule {
  id: string;
  title: string;
  ustadz: string | null;
  day_of_week: number | null; // 0=Minggu ... 6=Sabtu, null jika tanggal spesifik
  specific_date: string | null;
  time_text: string;
  location: string | null;
  description: string | null;
  foto_url: string | null;
  link_youtube: string | null;
  live_video_id: string | null;
  live_by_name: string | null;
  live_started_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface KhatibJumatSchedule {
  id: string;
  tanggal: string; // "YYYY-MM-DD"
  nama_ustadz: string;
  /** Nama Imam & Muadzin shalat Jumat -- opsional, dipakai mengisi Laporan
   * Jumat otomatis (lihat src/lib/laporanJumat.ts). Migrasi 23. */
  imam: string | null;
  muadzin: string | null;
  link_youtube: string | null;
  live_video_id: string | null;
  live_by_name: string | null;
  live_started_at: string | null;
  is_active: boolean;
  /** Status konfirmasi kehadiran khatib -- default false ("Belum Dikonfirmasi"). */
  is_confirmed: boolean;
  created_at: string;
}

export interface PrayerOverride {
  id: string;
  date: string;
  subuh: string | null;
  dzuhur: string | null;
  ashar: string | null;
  maghrib: string | null;
  isya: string | null;
  jumat: string | null;
  note: string | null;
}

export interface InfaqInfo {
  id: string;
  ewallet_name: string | null;
  ewallet_number: string | null;
  qr_image_url: string | null;
  description: string | null;
}

/** Satu rekening bank Infaq & Shadaqah -- bisa lebih dari satu baris
 * (dikelola di Dashboard > Pengaturan Konten > Info Infaq), beda dari
 * InfaqInfo yang cuma menyimpan info umum & e-wallet (1 baris). */
export interface InfaqRekening {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string | null;
  qris_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  /** Nama tampilan custom, mis. "@al_amanah_dps" -- kalau kosong, tampilkan
   * nama platform-nya saja (lihat Footer.tsx). */
  display_name: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface AboutContent {
  id: string;
  content: string;
  address: string | null;
  maps_url: string | null;
  updated_at: string;
}

export type FinancialJenis = "BRI" | "BSI" | "UP Tunai" | "Infaq Buka Puasa" | "Donasi" | "Ramadhan" | "Qurban";

// Dipakai di dropdown input manual & baris draft upload CSV. Memilih salah
// satu dari "UP Tunai"/"Infaq Buka Puasa"/"Donasi"/"Ramadhan"/"Qurban" berarti
// baris itu langsung dicatat di "kantong" dana itu sendiri (tabel_up_tunai,
// dst -- lihat src/lib/tabelKeuangan.ts), BUKAN rekening bank.
export const FINANCIAL_JENIS: FinancialJenis[] = [
  "BRI",
  "BSI",
  "UP Tunai",
  "Infaq Buka Puasa",
  "Donasi",
  "Ramadhan",
  "Qurban",
];

export type FinancialKriteria =
  | "Saldo Awal"
  | "Transfer"
  | "Setor Tunai Jumat"
  | "QRIS"
  | "Admin"
  | "Gaji"
  | "Kegiatan Dakwah"
  | "Kegiatan Sosial"
  | "Kegiatan Sarpras"
  | "Lainnya"
  | "Ramadhan"
  | "Qurban"
  | "Donasi"
  | "Infaq Buka Puasa"
  | "Setor UP Tunai"
  | "Terima UP Tunai"
  | "Setor UM Ramadhan"
  | "Terima UM Ramadhan"
  | "Setor UM Qurban"
  | "Terima UM Qurban";

export const FINANCIAL_KRITERIA: FinancialKriteria[] = [
  "Saldo Awal",
  "Transfer",
  "Setor Tunai Jumat",
  "QRIS",
  "Admin",
  "Gaji",
  "Kegiatan Dakwah",
  "Kegiatan Sosial",
  "Kegiatan Sarpras",
  "Lainnya",
  "Ramadhan",
  "Qurban",
  "Donasi",
  "Infaq Buka Puasa",
  "Setor UP Tunai",
  "Terima UP Tunai",
  "Setor UM Ramadhan",
  "Terima UM Ramadhan",
  "Setor UM Qurban",
  "Terima UM Qurban",
];

export interface FinancialTransaction {
  id: string;
  tanggal: string | null; // ISO timestamptz, null hanya utk Saldo Awal tanpa tanggal
  periode: string; // mis. "Pekan 1"
  uraian: string | null; // deskripsi mentah asli dari rekening koran
  kriteria: FinancialKriteria;
  debet: number; // uang MASUK (perspektif kas mushalla)
  kredit: number; // uang KELUAR (perspektif kas mushalla)
  keterangan: string | null;
  jenis: FinancialJenis;
  created_by: string | null;
  created_at: string;
}

/** Catatan periode Laporan Keuangan yang sudah dipublikasikan bendahara ke
 * halaman publik (lihat migration_022_laporan_publikasi.sql). Tanpa baris di
 * sini utk suatu periode = periode itu belum tampil ke publik. */
export interface LaporanPublikasi {
  periode: string;
  published_at: string;
  published_by: string | null;
}

/** Baris transaksi hasil parsing file, sebelum disimpan ke database. */
export interface DraftTransaction {
  tanggal: string; // datetime-local string "YYYY-MM-DDTHH:mm"
  uraian: string;
  kriteria: FinancialKriteria;
  debet: number;
  kredit: number;
  keterangan: string;
  jenis: FinancialJenis; // default ikut tombol upload yang dipakai (BRI/BSI), bisa diubah manual
  /** ID pengelompokan (uuid) -- SEMUA baris jurnal (di tabel manapun) yang
   * dihasilkan dari 1 transaksi "asli" yang sama (lihat buildJurnalRows di
   * tabelKeuangan.ts) memakai groupId yang sama, disimpan sebagai kolom
   * `jurnal_group_id` di database. Ini yang membuat hapus 1 baris otomatis
   * ikut menghapus baris pasangannya di tabel lain (lewat trigger DB, lihat
   * migration_020) -- supaya data across tabel_bank/tabel_up_bank/
   * tabel_up_tunai/dst tidak pernah tidak-sinkron. Draft "kontra" yang
   * dibuat lewat FinancePage.updateDraft (pilih Jenis "UP Tunai" pada baris
   * upload) SENGAJA mewarisi groupId dari baris asalnya (lewat spread
   * `...src`) supaya ikut satu kelompok yang sama, bukan dibuatkan baru. */
  groupId: string;
}

export interface InventoryCategory {
  kode: string; // "1000", "2000", "3000", "9000"
  nama: string;
  sort_order: number;
  last_seq: number;
}

export interface InventoryItem {
  id: string;
  kode_barang: string; // mis. "1000.0001", tidak pernah dipakai ulang
  nama_barang: string;
  kategori_kode: string;
  jumlah: number;
  nilai: number;
  kondisi: string | null;
  lokasi: string | null;
  tahun_perolehan: number | null;
  foto_url: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type InventoryDisposalTipe = "hibah" | "hapus";

export interface InventoryDisposal {
  id: string;
  kode_barang: string;
  nama_barang: string;
  kategori_kode: string;
  jumlah: number;
  nilai: number;
  kondisi: string | null;
  lokasi: string | null;
  tahun_perolehan: number | null;
  tipe: InventoryDisposalTipe;
  hibah_kepada: string | null;
  alasan_hapus: string | null;
  tanggal: string;
  keterangan: string | null;
  foto_url: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface Ustadz {
  id: string;
  nama: string;
  kontak: string | null;
  bidang: string | null;
  keterangan: string | null;
  bank_name: string | null;
  account_number: string | null;
  created_at: string;
}

export type ArticleStatus = "draft" | "pending" | "published" | "rejected";

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  cover_image_url: string | null;
  author_id: string | null;
  author_name: string | null;
  status: ArticleStatus;
  rejection_note: string | null;
  published_at: string | null;
  created_at: string;
}
