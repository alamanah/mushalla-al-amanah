-- =====================================================================
-- Migrasi 008: Jenis rekening "Infaq Buka Puasa" + Kriteria "Setor UP
-- Tunai" & "Terima UP Tunai"
--
-- Jalankan file ini SENDIRIAN (Run terpisah) -- PostgreSQL tidak
-- mengizinkan nilai enum baru dipakai di transaksi yang sama saat ia
-- ditambahkan.
-- =====================================================================

alter type financial_jenis add value if not exists 'Infaq Buka Puasa';
alter type financial_kriteria add value if not exists 'Setor UP Tunai';
alter type financial_kriteria add value if not exists 'Terima UP Tunai';
