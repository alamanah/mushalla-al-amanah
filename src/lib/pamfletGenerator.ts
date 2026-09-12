// Generator pamflet kajian otomatis: gambar poster (1200x750, landscape --
// sesuai ukuran kartu Jadwal Kajian di beranda) digambar langsung di
// <canvas> browser dari data kajian yang sudah diisi admin (judul, ustadz,
// tanggal, jam, lokasi) digabung data yang sudah ada di aplikasi (rekening
// Infaq, kontak WhatsApp & platform live dari Media Sosial). Latar
// belakangnya BUKAN hasil unduh dari internet (lihat catatan di README/chat)
// -- semua digambar sendiri lewat kode (gradasi warna + motif garis + hiasan
// sudut sederhana) supaya tidak tergantung sumber gambar pihak ketiga dan
// selalu konsisten bentuknya walau isi teksnya beda-beda panjang.
//
// Hasil akhirnya di-convert ke Blob (PNG) lalu dikirim ke alur upload yang
// sudah ada (uploadPamfletToDrive, lihat pamfletUpload.ts) -- generator ini
// sendiri tidak melakukan upload apa pun, cuma menggambar.

const WIDTH = 1200;
const HEIGHT = 750;

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

interface Palette {
  name: string;
  bgFrom: string;
  bgTo: string;
  gold: string;
  goldDeep: string;
}

export const PAMFLET_PALETTES: Palette[] = [
  { name: "Navy Emas", bgFrom: "#0b1f3f", bgTo: "#16305c", gold: "#f0d99a", goldDeep: "#d4af37" },
  { name: "Hijau Klasik", bgFrom: "#052b1b", bgTo: "#0d4e32", gold: "#f0d99a", goldDeep: "#d4af37" },
  { name: "Maroon Elegan", bgFrom: "#3b0a14", bgTo: "#5c0f1f", gold: "#f0d99a", goldDeep: "#d4af37" },
  { name: "Teal Malam", bgFrom: "#042f2e", bgTo: "#0f4c4a", gold: "#f0d99a", goldDeep: "#d4af37" },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    img.src = src;
  });
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

/** Gambar satu pamflet kajian ke canvas lalu kembalikan sebagai Blob PNG.
 * `paletteIndex` di-modulo otomatis, jadi aman dipanggil dengan indeks
 * berapa pun (dipakai tombol "Buat Ulang" untuk siklus ganti tema warna). */
export async function generatePamfletImage(data: PamfletData, paletteIndex = 0): Promise<Blob> {
  const palette = PAMFLET_PALETTES[((paletteIndex % PAMFLET_PALETTES.length) + PAMFLET_PALETTES.length) % PAMFLET_PALETTES.length];

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung Canvas 2D.");

  const arabicFont = await ensureAmiriFont();
  await document.fonts.load("700 40px Inter").catch(() => undefined);

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

  label2(ctx, "Rekening Infaq", col1X, footerY + 30, palette);
  if (data.rekening.length === 0) {
    smallLine(ctx, "Belum ada rekening aktif.", col1X, footerY + 56, colW - 20);
  } else {
    data.rekening.slice(0, 2).forEach((r, i) => {
      smallLine(ctx, `${r.bank_name}: ${r.account_number}`, col1X, footerY + 56 + i * 22, colW - 20);
    });
  }

  label2(ctx, "Informasi & Konfirmasi", col2X, footerY + 30, palette);
  smallLine(ctx, data.whatsapp ?? "-", col2X, footerY + 56, colW - 20, 18);

  label2(ctx, "Live Streaming", col3X, footerY + 30, palette);
  smallLine(ctx, data.livePlatforms.length ? data.livePlatforms.join(" & ") : "-", col3X, footerY + 56, colW - 20, 18);
  ctx.fillStyle = "#c9c9d6";
  ctx.font = "400 13px Inter";
  ctx.fillText(truncate(ctx, data.orgName, colW - 20), col3X, footerY + 82);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Gagal membuat gambar pamflet."));
    }, "image/png");
  });
}

function label2(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, palette: Palette) {
  ctx.fillStyle = palette.gold;
  ctx.font = "700 13px Inter";
  ctx.textAlign = "left";
  ctx.fillText(text.toUpperCase(), x, y);
}

function smallLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, size = 16) {
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${size}px Inter`;
  ctx.fillText(truncate(ctx, text, maxWidth), x, y);
}
