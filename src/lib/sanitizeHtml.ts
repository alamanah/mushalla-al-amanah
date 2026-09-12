// Sanitasi HTML sederhana untuk konten artikel/bacaan -- isi artikel
// sekarang boleh mengandung format dasar (bold/italic/underline/paragraf)
// dari RichTextEditor, disimpan sebagai HTML di kolom `content`. Karena
// artikel ditulis oleh user publik (bukan cuma admin), HTML-nya WAJIB
// disaring dulu -- baik sebelum disimpan (jaga-jaga kalau ada yang
// mengirim lewat API langsung, bukan lewat editor) maupun sebelum
// ditampilkan (dangerouslySetInnerHTML) -- supaya tidak ada celah XSS
// (script, event handler, dst).
import DOMPurify from "dompurify";

const ALLOWED_TAGS = ["b", "strong", "i", "em", "u", "br", "p", "div", "ul", "ol", "li"];

/** Bersihkan HTML artikel -- cuma izinkan tag format dasar, tanpa atribut
 * sama sekali (jadi tidak ada style/onclick/href yang bisa disusupi). */
export function sanitizeArticleHtml(html: string): string {
  return DOMPurify.sanitize(html ?? "", { ALLOWED_TAGS, ALLOWED_ATTR: [] });
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
