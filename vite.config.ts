import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// NOTE untuk deploy ke GitHub Pages:
// Jika repo kamu di-deploy sebagai project page (https://<user>.github.io/<repo>/),
// set BASE_PATH="/<nama-repo>/" saat build (sudah diatur otomatis di GitHub Actions workflow).
// Jika deploy sebagai user/organization page (https://<user>.github.io/) atau pakai domain sendiri, biarkan "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || "/",
});
