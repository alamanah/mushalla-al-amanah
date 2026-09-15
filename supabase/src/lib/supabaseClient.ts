import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Bantu debugging saat env belum di-set (baik lokal maupun di GitHub Actions).
  console.error(
    "Supabase belum dikonfigurasi. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diisi."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
