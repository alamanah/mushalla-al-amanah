import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// NOTE untuk deploy ke GitHub Pages:
// Jika repo kamu di-deploy sebagai project page (https://<user>.github.io/<repo>/),
// set BASE_PATH="/<nama-repo>/" saat build (sudah diatur otomatis di GitHub Actions workflow).
// Jika deploy sebagai user/organization page (https://<user>.github.io/) atau pakai domain sendiri, biarkan "/".
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["mosque.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Mushalla Al Amanah GKN I Denpasar",
        short_name: "Al Amanah",
        description:
          "Aplikasi Mushalla Al Amanah GKN I Denpasar: jadwal shalat & kajian, keuangan, inventaris, dan bacaan Islami.",
        theme_color: "#0d4e32",
        background_color: "#0d4e32",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        scope: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Jangan cache API Supabase / Aladhan supaya data selalu terbaru;
        // hanya precache aset statis build (JS/CSS/gambar/font).
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallbackDenylist: [/^\/auth\/callback/, /^\/reset-password/],
      },
    }),
  ],
  base: process.env.BASE_PATH || "/",
});
