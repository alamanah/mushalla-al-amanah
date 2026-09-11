-- =====================================================================
-- Migrasi 007: Kriteria baru "Infaq Buka Puasa" + tab Buka Puasa
--
-- Jalankan file ini SENDIRIAN (Run terpisah) -- PostgreSQL tidak
-- mengizinkan nilai enum baru dipakai di transaksi yang sama saat ia
-- ditambahkan.
-- =====================================================================

alter type financial_kriteria add value if not exists 'Infaq Buka Puasa';

-- Catatan: transaksi dengan Keterangan yang menyebut "Buka Puasa" akan
-- otomatis ikut masuk ke tab Buka Puasa di Dashboard > Keuangan, meskipun
-- Kriteria-nya bukan "Infaq Buka Puasa" -- ini logikanya ada di aplikasi
-- (src/lib/laporanKeuangan.ts), tidak perlu perubahan lain di database.
