// Generator pamflet kajian otomatis: gambar poster (1200x750, landscape --
// sesuai ukuran kartu Jadwal Kajian di beranda) digambar langsung di
// <canvas> browser dari data kajian yang sudah diisi admin (judul, ustadz,
// tanggal, jam, lokasi) digabung data yang sudah ada di aplikasi (rekening
// Infaq, kontak WhatsApp & platform live dari Media Sosial). Semua elemen
// visual (bingkai, motif, siluet masjid) digambar sendiri lewat kode --
// BUKAN hasil unduh/scrape dari internet (mis. Pinterest) -- supaya tidak
// ada masalah hak cipta dan selalu konsisten bentuknya walau isi teksnya
// beda-beda panjang. Ada 2 pilihan template (lihat PamfletTemplate):
// "ornate" (bingkai emas, versi awal) dan "kajian-rutin" (ilustrasi siluet
// masjid + langit senja, sesuai referensi yang diminta admin).
//
// Hasil akhirnya di-convert ke Blob (JPEG) lalu dikirim ke alur upload yang
// sudah ada (uploadPamfletToDrive, lihat pamfletUpload.ts) -- generator ini
// sendiri tidak melakukan upload apa pun, cuma menggambar.

const WIDTH = 1200;
const HEIGHT = 750;

export type PamfletTemplate = "ornate" | "kajian-rutin";

export const PAMFLET_TEMPLATE_LABELS: Record<PamfletTemplate, string> = {
  ornate: "Kajian Tematik (bingkai emas)",
  "kajian-rutin": "Kajian Rutin (ilustrasi masjid)",
};

export interface PamfletRekening {
  bank_name: string;
  account_number: string;
  account_holder: string | null;
}

export interface PamfletData {
  title: string;
  ustadz: string | null;
  description: string | null;
  /** Sudah diformat, mis. "Kamis, 22 Januari 2026". */
  dateLabel: string;
  /** Sudah diformat, mis. "4 Sya'ban 1447 H" -- boleh null kalau gagal diambil. */
  hijriLabel: string | null;
  timeText: string;
  location: string | null;
  rekening: PamfletRekening[];
  /** Mis. "wa.me/6285719985097" -- boleh null kalau belum ada kontak WA aktif. */
  whatsapp: string | null;
  /** Mis. ["Facebook", "Youtube"] -- daftar platform live yang aktif. */
  livePlatforms: string[];
  orgName: string;
}

interface OrnatePalette {
  name: string;
  bgFrom: string;
  bgTo: string;
  gold: string;
  goldDeep: string;
}

export const PAMFLET_PALETTES: OrnatePalette[] = [
  { name: "Navy Emas", bgFrom: "#0b1f3f", bgTo: "#16305c", gold: "#f0d99a", goldDeep: "#d4af37" },
  { name: "Hijau Klasik", bgFrom: "#052b1b", bgTo: "#0d4e32", gold: "#f0d99a", goldDeep: "#d4af37" },
  { name: "Maroon Elegan", bgFrom: "#3b0a14", bgTo: "#5c0f1f", gold: "#f0d99a", goldDeep: "#d4af37" },
  { name: "Teal Malam", bgFrom: "#042f2e", bgTo: "#0f4c4a", gold: "#f0d99a", goldDeep: "#d4af37" },
];

interface KajianRutinPalette {
  name: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  silhouette: string;
  card: string;
  accent: string;
}

export const KAJIAN_RUTIN_PALETTES: KajianRutinPalette[] = [
  { name: "Senja Emas", skyTop: "#0f1a30", skyMid: "#4d3a24", skyBottom: "#e7b566", silhouette: "#0a1220", card: "#1f6f4a", accent: "#f0d99a" },
  { name: "Senja Biru", skyTop: "#0c1730", skyMid: "#233458", skyBottom: "#93add8", silhouette: "#08101f", card: "#1b4f72", accent: "#dbe8f7" },
  { name: "Senja Hijau", skyTop: "#0b241d", skyMid: "#1c4a3a", skyBottom: "#b9d7a8", silhouette: "#071712", card: "#14532d", accent: "#dcedd0" },
];

function normIndex(i: number, len: number): number {
  return ((i % len) + len) % len;
}

/** Berapa banyak pilihan tema warna yang tersedia untuk 1 template --
 * dipakai UI supaya tombol "Buat Ulang" tahu batas siklusnya. */
export function paletteCount(template: PamfletTemplate): number {
  return template === "kajian-rutin" ? KAJIAN_RUTIN_PALETTES.length : PAMFLET_PALETTES.length;
}

/** Nama tema warna ke-`index` untuk 1 template -- ditampilkan di pratinjau. */
export function paletteName(template: PamfletTemplate, index: number): string {
  if (template === "kajian-rutin") {
    return KAJIAN_RUTIN_PALETTES[normIndex(index, KAJIAN_RUTIN_PALETTES.length)].name;
  }
  return PAMFLET_PALETTES[normIndex(index, PAMFLET_PALETTES.length)].name;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    img.src = src;
  });
}

/** Ubah gambar (mis. logo PNG berwarna) jadi versi siluet putih polos --
 * bagian yang tidak transparan diwarnai putih, bentuk/transparansi asli
 * tetap dipertahankan. Dipakai supaya logo tetap kebaca di atas latar foto
 * gelap tanpa perlu file logo versi putih terpisah. */
function tintImageWhite(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const cctx = c.getContext("2d")!;
  cctx.drawImage(img, 0, 0);
  cctx.globalCompositeOperation = "source-in";
  cctx.fillStyle = "#ffffff";
  cctx.fillRect(0, 0, c.width, c.height);
  return c;
}

let amiriRequested = false;
/** Muat font kaligrafi Arab "Amiri" dari Google Fonts khusus untuk baris
 * Bismillah di pamflet (terpisah dari font situs yang memang sengaja
 * diseragamkan ke Inter). Diam-diam gagal (pakai font fallback) kalau
 * browser tidak ada koneksi internet saat itu -- generator tetap jalan. */
async function ensureAmiriFont(): Promise<string> {
  try {
    if (!amiriRequested) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap";
      document.head.appendChild(link);
      amiriRequested = true;
    }
    await Promise.all([document.fonts.load("700 48px Amiri"), document.fonts.load("400 24px Amiri")]);
    return "Amiri, serif";
  } catch {
    return "serif";
  }
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Tekstur garis diagonal tipis (jadi motif belah ketupat waktu saling
 * silang) -- dekorasi latar yang ringan, tidak mengganggu keterbacaan teks. */
function drawLatticeTexture(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, spacing = 44) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = -h; i < w + h; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - h, h);
    ctx.stroke();
  }
  ctx.restore();
}

/** Hiasan sudut geometris sederhana (lengkung + titik-titik kecil) --
 * versi simpel dari motif sulur/bunga khas pamflet kajian, supaya tetap
 * rapi dipakai berulang untuk kajian apa pun tanpa terlihat berantakan. */
function drawCornerOrnament(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, flipX: boolean, flipY: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.quadraticCurveTo(0, 0, size, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.34, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(size * 0.16 * i + 6, size * 0.16 * i + 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Siluet kubah masjid sederhana -- ilustrasi buatan sendiri (bukan foto),
 * dipakai sebagai latar template "Kajian Rutin". */
function drawDome(ctx: CanvasRenderingContext2D, cx: number, baseY: number, width: number, height: number) {
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, baseY);
  ctx.quadraticCurveTo(cx - width / 2, baseY - height, cx, baseY - height);
  ctx.quadraticCurveTo(cx + width / 2, baseY - height, cx + width / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 3, baseY - height + 4);
  ctx.lineTo(cx, baseY - height - 22);
  ctx.lineTo(cx + 3, baseY - height + 4);
  ctx.closePath();
  ctx.fill();
}

function drawMinaret(ctx: CanvasRenderingContext2D, cx: number, baseY: number, height: number) {
  const w = 22;
  ctx.fillRect(cx - w / 2, baseY - height, w, height);
  ctx.beginPath();
  ctx.arc(cx, baseY - height, w / 1.4, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 2, baseY - height - w / 1.4);
  ctx.lineTo(cx, baseY - height - w / 1.4 - 18);
  ctx.lineTo(cx + 2, baseY - height - w / 1.4);
  ctx.closePath();
  ctx.fill();
}

function drawMosqueSilhouette(ctx: CanvasRenderingContext2D, color: string) {
  const baseY = HEIGHT * 0.87;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.94;
  ctx.fillRect(0, baseY, WIDTH, HEIGHT - baseY);
  drawDome(ctx, WIDTH / 2, baseY, 170, 140);
  drawDome(ctx, WIDTH / 2 - 230, baseY, 100, 82);
  drawDome(ctx, WIDTH / 2 + 230, baseY, 100, 82);
  drawMinaret(ctx, 120, baseY, 270);
  drawMinaret(ctx, WIDTH - 120, baseY, 270);
  ctx.restore();
}

/** Ikon kalender sederhana (garis, bukan emoji) supaya senada dengan gaya
 * ikon lain di situs -- x/y = pojok kiri-atas kotak pembungkus, size = sisi
 * kotak pembungkus. */
function drawCalendarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.4, size * 0.08);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  roundedRectPath(ctx, x, y + size * 0.18, size, size * 0.78, size * 0.12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.42);
  ctx.lineTo(x + size, y + size * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.26, y);
  ctx.lineTo(x + size * 0.26, y + size * 0.3);
  ctx.moveTo(x + size * 0.74, y);
  ctx.lineTo(x + size * 0.74, y + size * 0.3);
  ctx.stroke();
  ctx.restore();
}

/** Ikon pin lokasi (path sama dengan IconMapPin di components/icons.tsx,
 * digambar ulang di canvas lewat Path2D supaya bentuknya konsisten). */
function drawMapPinIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  const path = new Path2D("M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z");
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(path);
  ctx.beginPath();
  ctx.arc(12, 9.5, 2.6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/** Cari ukuran font sebesar mungkin (kelipatan turun 2px) supaya teks tetap
 * muat dalam `maxLines` baris pada lebar `maxWidth`. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  weight: string,
  family: string,
  maxSize: number,
  minSize: number
): { size: number; lines: string[] } {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
    size -= 2;
  }
  ctx.font = `${weight} ${minSize}px ${family}`;
  return { size: minSize, lines: wrapText(ctx, text, maxWidth) };
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

/** Gambar bagian `img` ke kotak tujuan dengan perilaku macam CSS
 * `background-size: cover` -- gambar diskalakan supaya menutup penuh kotak
 * tujuan (tanpa gepeng), lalu bagian yang kelebihan dipotong di tengah.
 * Dipakai untuk latar belakang kustom yang diunggah admin sendiri, supaya
 * rasio gambar apa pun otomatis menyesuaikan rasio pamflet (1200x750). */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const iw = img.width;
  const ih = img.height;
  const imgRatio = iw / ih;
  const boxRatio = dw / dh;
  let sx: number, sy: number, sw: number, sh: number;
  if (imgRatio > boxRatio) {
    sh = ih;
    sw = sh * boxRatio;
    sx = (iw - sw) / 2;
    sy = 0;
  } else {
    sw = iw;
    sh = sw / boxRatio;
    sx = 0;
    sy = (ih - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** Ikon YouTube sederhana (sama dengan IconYoutubeGlyph di components/icons.tsx)
 * -- kotak bulat + segitiga play, dipakai di baris "LIVE" pamflet. */
function drawYoutubeIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  roundedRectPath(ctx, 2.5, 5.5, 19, 13, 4);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill(new Path2D("M10.3 9.4v5.2l4.8-2.6-4.8-2.6Z"));
  ctx.restore();
}

/** Gambar satu pamflet kajian ke canvas lalu kembalikan sebagai Blob JPEG.
 * `paletteIndex` di-modulo otomatis, jadi aman dipanggil dengan indeks
 * berapa pun (dipakai tombol "Buat Ulang" untuk siklus ganti tema warna).
 * `customBackground` (khusus template "kajian-rutin") -- kalau diisi
 * (gambar yang diunggah admin sendiri), dipakai sebagai latar (dipotong
 * otomatis mengikuti rasio pamflet) menggantikan ilustrasi siluet masjid. */
export async function generatePamfletImage(
  data: PamfletData,
  template: PamfletTemplate,
  paletteIndex = 0,
  customBackground?: HTMLImageElement | null
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung Canvas 2D.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const arabicFont = await ensureAmiriFont();
  await document.fonts.load("700 40px Inter").catch(() => undefined);

  if (template === "kajian-rutin") {
    const palette = KAJIAN_RUTIN_PALETTES[normIndex(paletteIndex, KAJIAN_RUTIN_PALETTES.length)];
    await drawKajianRutinTemplate(ctx, data, palette, arabicFont, customBackground ?? null);
  } else {
    const palette = PAMFLET_PALETTES[normIndex(paletteIndex, PAMFLET_PALETTES.length)];
    await drawOrnateTemplate(ctx, data, palette, arabicFont);
  }

  // JPEG (bukan PNG) sengaja dipilih di sini -- ukuran filenya jauh lebih
  // kecil untuk gambar sekompleks ini (latar gradasi+tekstur), jadi upload
  // ke Drive lebih cepat & lebih jarang gagal di koneksi lambat. Kualitas
  // visualnya tidak kelihatan bedanya karena tidak ada bagian yang perlu
  // transparan.
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal membuat gambar pamflet."));
      },
      "image/jpeg",
      0.92
    );
  });
}

// ============================================================================
// Template 1: "ornate" -- bingkai emas ganda, panel judul putih (versi awal).
// ============================================================================
async function drawOrnateTemplate(ctx: CanvasRenderingContext2D, data: PamfletData, palette: OrnatePalette, arabicFont: string) {
  // ---- Latar belakang ----
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGrad.addColorStop(0, palette.bgFrom);
  bgGrad.addColorStop(1, palette.bgTo);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawLatticeTexture(ctx, WIDTH, HEIGHT, palette.gold);

  // ---- Bingkai emas ganda ----
  ctx.strokeStyle = palette.goldDeep;
  ctx.lineWidth = 3;
  roundedRectPath(ctx, 20, 20, WIDTH - 40, HEIGHT - 40, 14);
  ctx.stroke();
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 1;
  roundedRectPath(ctx, 30, 30, WIDTH - 60, HEIGHT - 60, 10);
  ctx.stroke();

  // ---- Hiasan sudut ----
  drawCornerOrnament(ctx, 40, 40, 44, palette.gold, false, false);
  drawCornerOrnament(ctx, WIDTH - 40, 40, 44, palette.gold, true, false);
  drawCornerOrnament(ctx, 40, HEIGHT - 40, 44, palette.gold, false, true);
  drawCornerOrnament(ctx, WIDTH - 40, HEIGHT - 40, 44, palette.gold, true, true);

  // ---- Badge "Terbuka untuk Umum" ----
  ctx.font = "700 15px Inter";
  const badgeText = "TERBUKA UNTUK UMUM · MUSLIM & MUSLIMAH";
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgeW = badgeTextW + 48;
  const badgeX = 60;
  const badgeY = 24;
  roundedRectPath(ctx, badgeX, badgeY, badgeW, 32, 16);
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = palette.gold;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(badgeText, badgeX + 24, badgeY + 17);
  ctx.textBaseline = "alphabetic";

  // ---- Logo + nama mushola (kanan atas) ----
  try {
    const logo = await loadImage(`${import.meta.env.BASE_URL}logo-al-amanah.png`);
    const logoSize = 56;
    const logoX = WIDTH - 60 - 170;
    const logoY = 22;
    ctx.drawImage(logo, logoX, logoY, logoSize, (logoSize * logo.height) / logo.width);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 16px Inter";
    ctx.textAlign = "left";
    ctx.fillText("MUSHOLA", logoX + logoSize + 12, logoY + 22);
    ctx.fillStyle = palette.gold;
    ctx.fillText("AL AMANAH", logoX + logoSize + 12, logoY + 42);
  } catch {
    // Diam-diam lewati logo kalau gagal dimuat -- pamflet tetap dibuat.
  }

  // ---- Bismillah (kaligrafi Arab) ----
  ctx.fillStyle = palette.gold;
  ctx.font = `700 46px ${arabicFont}`;
  ctx.textAlign = "left";
  ctx.fillText("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 60, 150);

  ctx.fillStyle = "#e8e8ef";
  ctx.font = "italic 400 18px Inter";
  ctx.fillText("Dengan mengharap ridho Allah, mari hadiri", 60, 200);

  // ---- Panel judul ----
  const panelX = 60;
  const panelY = 224;
  const panelW = 660;
  const panelPad = 26;

  ctx.font = "700 40px Inter";
  const fitted = fitText(ctx, data.title, panelW - panelPad * 2, 2, "700", "Inter", 44, 26);

  ctx.font = "400 18px Inter";
  const descLinesFinal = data.description ? wrapText(ctx, data.description, panelW - panelPad * 2).slice(0, 2) : [];

  const titleLineHeight = fitted.size * 1.18;
  const descLineHeight = 24;
  const panelH =
    panelPad * 2 + fitted.lines.length * titleLineHeight + (descLinesFinal.length ? 10 + descLinesFinal.length * descLineHeight : 0);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  roundedRectPath(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.fill();

  const titleGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  titleGrad.addColorStop(0, palette.goldDeep);
  titleGrad.addColorStop(1, "#8a6a12");
  ctx.fillStyle = titleGrad;
  ctx.font = `700 ${fitted.size}px Inter`;
  ctx.textAlign = "left";
  fitted.lines.forEach((line, i) => {
    ctx.fillText(line, panelX + panelPad, panelY + panelPad + fitted.size * 0.85 + i * titleLineHeight);
  });

  if (descLinesFinal.length) {
    ctx.fillStyle = "#374151";
    ctx.font = "400 18px Inter";
    const descTop = panelY + panelPad + fitted.lines.length * titleLineHeight + 10;
    descLinesFinal.forEach((line, i) => {
      ctx.fillText(line, panelX + panelPad, descTop + i * descLineHeight + 14);
    });
  }

  // ---- Nama pemateri ----
  if (data.ustadz) {
    ctx.fillStyle = palette.gold;
    ctx.font = "700 25px Inter";
    ctx.fillText(truncate(ctx, data.ustadz, panelW), panelX, panelY + panelH + 40);
  }

  // ---- Kolom kanan: jadwal ----
  const rightX = 760;
  const rightW = WIDTH - 60 - rightX;
  ctx.strokeStyle = "rgba(240,217,154,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightX - 30, 96);
  ctx.lineTo(rightX - 30, 552);
  ctx.stroke();

  const label = (text: string, y: number) => {
    ctx.fillStyle = palette.gold;
    ctx.font = "700 13px Inter";
    ctx.textAlign = "left";
    ctx.fillText(text.toUpperCase(), rightX, y);
  };
  const value = (text: string, y: number, size = 22) => {
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${size}px Inter`;
    ctx.fillText(truncate(ctx, text, rightW), rightX, y);
  };

  let ry = 120;
  label("Hari & Tanggal", ry);
  ry += 26;
  value(data.dateLabel, ry);
  ry += 24;
  if (data.hijriLabel) {
    ctx.fillStyle = "#d8ceb0";
    ctx.font = "italic 400 15px Inter";
    ctx.fillText(data.hijriLabel, rightX, ry);
    ry += 22;
  }
  ry += 20;
  label("Waktu", ry);
  ry += 26;
  value(data.timeText, ry);
  ry += 48;
  label("Lokasi", ry);
  ry += 26;
  if (data.location) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 17px Inter";
    const locLines = wrapText(ctx, data.location, rightW).slice(0, 3);
    locLines.forEach((line, i) => ctx.fillText(line, rightX, ry + i * 22));
  }

  // ---- Garis pemisah footer ----
  ctx.strokeStyle = palette.goldDeep;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 578);
  ctx.lineTo(WIDTH - 60, 578);
  ctx.stroke();

  // ---- Footer: rekening / kontak / live ----
  const footerY = 578;
  const colW = (WIDTH - 120) / 3;
  const col1X = 60;
  const col2X = 60 + colW;
  const col3X = 60 + colW * 2;

  const footerLabel = (text: string, x: number, y: number) => {
    ctx.fillStyle = palette.gold;
    ctx.font = "700 13px Inter";
    ctx.textAlign = "left";
    ctx.fillText(text.toUpperCase(), x, y);
  };
  const footerLine = (text: string, x: number, y: number, maxWidth: number, size = 16) => {
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${size}px Inter`;
    ctx.fillText(truncate(ctx, text, maxWidth), x, y);
  };

  footerLabel("Rekening Infaq", col1X, footerY + 30);
  if (data.rekening.length === 0) {
    footerLine("Belum ada rekening aktif.", col1X, footerY + 56, colW - 20);
  } else {
    data.rekening.slice(0, 2).forEach((r, i) => {
      footerLine(`${r.bank_name}: ${r.account_number}`, col1X, footerY + 56 + i * 22, colW - 20);
    });
  }

  footerLabel("Informasi & Konfirmasi", col2X, footerY + 30);
  footerLine(data.whatsapp ?? "-", col2X, footerY + 56, colW - 20, 18);

  footerLabel("Live Streaming", col3X, footerY + 30);
  footerLine(data.livePlatforms.length ? data.livePlatforms.join(" & ") : "-", col3X, footerY + 56, colW - 20, 18);
  ctx.fillStyle = "#c9c9d6";
  ctx.font = "400 13px Inter";
  ctx.fillText(truncate(ctx, data.orgName, colW - 20), col3X, footerY + 82);
}

// ============================================================================
// Template 2: "kajian-rutin" -- ilustrasi siluet masjid + langit senja (atau
// latar foto kustom unggahan admin), logo putih di tengah atas, kaligrafi
// Bismillah dalam bingkai oval, kartu jadwal/lokasi hijau/biru.
// ============================================================================
async function drawKajianRutinTemplate(
  ctx: CanvasRenderingContext2D,
  data: PamfletData,
  palette: KajianRutinPalette,
  arabicFont: string,
  customBackground: HTMLImageElement | null
) {
  const centerX = WIDTH / 2;

  if (customBackground) {
    // ---- Latar foto/gambar kustom unggahan admin sendiri -- dipotong
    // otomatis mengikuti rasio pamflet (mirip CSS background-size: cover). ----
    drawImageCover(ctx, customBackground, 0, 0, WIDTH, HEIGHT);
  } else {
    // ---- Langit senja (ilustrasi, bukan foto) ----
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(0.55, palette.skyMid);
    sky.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Bintang kecil di langit atas -- dekorasi ringan.
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 46; i++) {
      const sx = ((i * 953) % WIDTH) + ((i * 37) % 17);
      const sy = ((i * 211) % (HEIGHT * 0.32)) + 8;
      ctx.beginPath();
      ctx.arc(sx, sy, i % 5 === 0 ? 1.4 : 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ---- Siluet masjid ----
    drawMosqueSilhouette(ctx, palette.silhouette);
  }

  // ---- Overlay gradasi gelap supaya teks tetap terbaca di segala latar,
  // baik ilustrasi sendiri maupun foto unggahan (yang belum tentu gelap). ----
  const overlay = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  overlay.addColorStop(0, "rgba(0,0,0,0.5)");
  overlay.addColorStop(0.35, "rgba(0,0,0,0.22)");
  overlay.addColorStop(0.68, "rgba(0,0,0,0.28)");
  overlay.addColorStop(1, "rgba(0,0,0,0.58)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let y = 68;

  // ---- Logo putih di tengah atas (diperbesar + digambar halus supaya
  // detail tulisan kecil di dalam logo tetap kebaca jelas). ----
  try {
    const logo = await loadImage(`${import.meta.env.BASE_URL}logo-al-amanah.png`);
    const whiteLogo = tintImageWhite(logo);
    const h = 78;
    const w = (h * whiteLogo.width) / whiteLogo.height;
    ctx.drawImage(whiteLogo, centerX - w / 2, y, w, h);
    y += h;
  } catch {
    // Diam-diam lewati logo kalau gagal dimuat.
  }
  y += 40;

  // ---- Kaligrafi Bismillah -- putih polos, tanpa bingkai lingkaran/oval. ----
  ctx.font = `700 34px ${arabicFont}`;
  const bismillahText = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(bismillahText, centerX, y + 16);
  y += 84;

  // ---- Judul ----
  ctx.font = "700 42px Inter";
  const fitted = fitText(ctx, data.title, 780, 2, "700", "Inter", 42, 26);
  ctx.fillStyle = "#fffdf6";
  const titleLineHeight = fitted.size * 1.16;
  fitted.lines.forEach((line, i) => {
    ctx.font = `700 ${fitted.size}px Inter`;
    ctx.fillText(line, centerX, y + i * titleLineHeight);
  });
  y += (fitted.lines.length - 1) * titleLineHeight + 34;

  // ---- "bersama: nama ustadz" + Hafidzahullahu ----
  if (data.ustadz) {
    ctx.font = "400 15px Inter";
    ctx.fillStyle = palette.accent;
    ctx.fillText("bersama:", centerX, y);
    y += 32;

    ctx.font = "700 22px Inter";
    const nameText = truncate(ctx, data.ustadz, 640);
    const nameW = ctx.measureText(nameText).width;
    const pillPadX = 22;
    const pillH = 38;
    roundedRectPath(ctx, centerX - nameW / 2 - pillPadX, y - pillH + 10, nameW + pillPadX * 2, pillH, 9);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(nameText, centerX, y);
    y += 38;

    ctx.font = "italic 400 16px Inter";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("Hafidzahullahu", centerX, y);
    y += 40;
  } else {
    y += 16;
  }

  // ---- Kartu jadwal (kalender) + lokasi (map) ----
  const cardW = 800;
  const cardX = centerX - cardW / 2;
  const cardY = y;
  const cardH = 92;
  ctx.fillStyle = palette.card;
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  const midX = cardX + cardW / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(midX, cardY + 16);
  ctx.lineTo(midX, cardY + cardH - 16);
  ctx.stroke();

  ctx.textAlign = "left";
  const colInnerW = cardW / 2 - 90;

  drawCalendarIcon(ctx, cardX + 28, cardY + cardH / 2 - 15, 28, "#ffffff");
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 17px Inter";
  ctx.fillText(truncate(ctx, data.dateLabel, colInnerW), cardX + 68, cardY + cardH / 2 - 4);
  ctx.font = "400 13px Inter";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const subLine = [data.timeText, data.hijriLabel].filter(Boolean).join(" · ");
  ctx.fillText(truncate(ctx, subLine, colInnerW), cardX + 68, cardY + cardH / 2 + 18);

  drawMapPinIcon(ctx, midX + 28, cardY + cardH / 2 - 15, 28, "#ffffff");
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 17px Inter";
  const locLines = wrapText(ctx, data.location ?? "-", colInnerW).slice(0, 2);
  if (locLines.length === 1) {
    ctx.fillText(locLines[0], midX + 68, cardY + cardH / 2 + 6);
  } else {
    ctx.font = "600 15px Inter";
    ctx.fillText(locLines[0], midX + 68, cardY + cardH / 2 - 4);
    ctx.fillText(locLines[1], midX + 68, cardY + cardH / 2 + 16);
  }

  // ---- Bar bawah: Live (+ ikon YouTube) & sampai 2 Rekening Infaq ----
  const rekList = data.rekening.slice(0, 2);
  const rightLines = rekList.length
    ? rekList.map((r) => `${r.bank_name}: ${r.account_number}`)
    : ["Belum ada rekening aktif."];
  const barLineCount = Math.max(1, rightLines.length);
  const barH = 26 + barLineCount * 20;
  const barTop = HEIGHT - 28 - barH;

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, barTop);
  ctx.lineTo(WIDTH - 60, barTop);
  ctx.stroke();

  const barCenterY = barTop + 14 + (barH - 14) / 2;

  if (data.livePlatforms.length) {
    const liveText = `LIVE ${data.livePlatforms.join(" & ").toUpperCase()}`;
    ctx.font = "700 15px Inter";
    const hasYoutube = data.livePlatforms.some((p) => p.toLowerCase() === "youtube");
    const iconGap = hasYoutube ? 26 : 0;
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    if (hasYoutube) drawYoutubeIcon(ctx, 60, barCenterY - 11, 22, "#ffffff");
    ctx.fillText(truncate(ctx, `● ${liveText}`, 480 - iconGap), 60 + iconGap, barCenterY + 5);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  const rightLineHeight = 20;
  const rightBlockTop = barCenterY + 5 - ((rightLines.length - 1) * rightLineHeight) / 2 - (rightLines.length > 1 ? 4 : 0);
  rightLines.forEach((line, i) => {
    ctx.font = i === 0 && rightLines.length > 1 ? "700 14px Inter" : "700 15px Inter";
    const prefix = rightLines.length > 1 ? "" : "INFAQ  ";
    ctx.fillText(truncate(ctx, `${prefix}${line}`, 480), WIDTH - 60, rightBlockTop + i * rightLineHeight);
  });
}
