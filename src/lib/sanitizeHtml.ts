// Sanitasi HTML sederhana untuk konten artikel/bacaan -- isi artikel
// sekarang boleh mengandung format dasar (bold/italic/underline/paragraf),
// perataan teks, daftar (bullet/nomor), kutipan, tautan, dan warna teks
// dari RichTextEditor, disimpan sebagai HTML di kolom `content`. Karena
// artikel ditulis oleh user publik (bukan cuma admin), HTML-nya WAJIB
// disaring dulu -- baik sebelum disimpan (jaga-jaga kalau ada yang
// mengirim lewat API langsung, bukan lewat editor) maupun sebelum
// ditampilkan (dangerouslySetInnerHTML) -- supaya tidak ada celah XSS
// (script, event handler, dst).
import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "br",
  "p",
  "div",
  "span",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
];
const ALLOWED_ATTR = ["style", "href", "target", "rel"];

// Properti CSS yang boleh muncul di atribut `style` -- cuma perataan teks
// (dari tombol justify) dan warna teks (dari tombol warna). Nilainya
// divalidasi juga supaya tidak ada yang menyusupkan url(...)/expression(...)
// atau nilai aneh lainnya lewat inline style.
const ALLOWED_STYLE_PROPS = new Set(["color", "text-align"]);
const SAFE_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[0-9.]+\s*\)|[a-zA-Z]+)$/;
const SAFE_TEXT_ALIGN_VALUES = new Set(["left", "right", "center", "justify", "start", "end"]);

function sanitizeStyleValue(rawStyle: string): string {
  const declarations = rawStyle
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean);
  const safe: string[] = [];
  for (const decl of declarations) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (!prop || !value) continue;
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (/url\(|expression\(|javascript:|\/\*/i.test(value)) continue;
    if (prop === "color" && SAFE_COLOR_RE.test(value)) {
      safe.push(`${prop}: ${value}`);
    } else if (prop === "text-align" && SAFE_TEXT_ALIGN_VALUES.has(value.toLowerCase())) {
      safe.push(`${prop}: ${value.toLowerCase()}`);
    }
  }
  return safe.join("; ");
}

let hookInstalled = false;
function ensureSanitizeHook() {
  if (hookInstalled) return;
  hookInstalled = true;
  DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
    if (data.attrName === "style") {
      data.attrValue = sanitizeStyleValue(data.attrValue);
      if (!data.attrValue) data.keepAttr = false;
    } else if (data.attrName === "target") {
      // Semua tautan dibuka di tab baru -- nilai lain diabaikan.
      data.attrValue = "_blank";
    } else if (data.attrName === "rel") {
      // Wajib noopener/noreferrer supaya tab baru tidak bisa akses `window.opener`.
      data.attrValue = "noopener noreferrer";
    }
  });
}

/** Bersihkan HTML artikel -- cuma izinkan tag & atribut format yang
 * dikenal (lihat ALLOWED_TAGS/ALLOWED_ATTR di atas), dengan atribut
 * `style` disaring lebih lanjut lewat hook supaya cuma properti warna &
 * perataan teks yang lolos. */
export function sanitizeArticleHtml(html: string): string {
  ensureSanitizeHook();
  return DOMPurify.sanitize(html ?? "", { ALLOWED_TAGS, ALLOWED_ATTR });
}

/** Buang semua tag HTML, sisakan teks polos -- dipakai untuk cuplikan
 * (excerpt) artikel di daftar/preview supaya tidak menampilkan tag
 * mentah seperti "<b>...</b>". Didekode lewat elemen DOM sungguhan (bukan
 * cuma string replace) supaya entity HTML seperti "&nbsp;" ikut berubah
 * jadi spasi biasa, bukan tampil apa adanya sebagai teks "&nbsp;". */
export function stripHtml(html: string): string {
  const withoutTags = DOMPurify.sanitize(html ?? "", { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  const tmp = document.createElement("div");
  tmp.innerHTML = withoutTags;
  return (tmp.textContent ?? "").replace(/\s+/g, " ").trim();
}
