-- =====================================================================
-- MIGRASI 002a — jalankan file ini SENDIRIAN dulu (Run), baru lanjut ke
-- migration_002b_finance_roles.sql di query terpisah.
--
-- PostgreSQL tidak mengizinkan nilai enum baru dipakai di transaksi yang
-- sama saat ia ditambahkan, jadi ini harus jadi langkah terpisah.
-- =====================================================================

alter type app_role add value if not exists 'humas';
