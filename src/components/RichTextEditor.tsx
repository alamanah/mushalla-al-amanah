import { ReactNode, useEffect, useRef } from "react";
import {
  IconAlignCenter,
  IconAlignJustify,
  IconAlignLeft,
  IconAlignRight,
  IconLinkGlyph,
  IconListBullet,
  IconListNumber,
  IconQuote,
  IconTextColor,
} from "./icons";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

// Kelas Tailwind untuk elemen di dalam konten -- dipakai sama persis di
// sini (mode edit) dan di ArticleDetail.tsx (mode tampil) supaya apa yang
// dilihat penulis saat mengetik cocok dengan hasil terbitnya. Karena
// plugin @tailwindcss/typography TIDAK dipasang di proyek ini, semua gaya
// list/blockquote/link ditulis manual lewat utilitas arbitrary-variant.
export const ARTICLE_CONTENT_CLASSNAME =
  "[&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 " +
  "[&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary-300 [&_blockquote]:pl-3 " +
  "[&_blockquote]:italic [&_blockquote]:text-gray-500 [&_blockquote]:my-2 " +
  "[&_a]:text-primary-700 [&_a]:underline [&_a]:break-words";

function ToolbarButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-7 w-7 shrink-0 rounded hover:bg-gray-200 text-gray-700 flex items-center justify-center ${className ?? ""}`}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <span className="w-px h-5 bg-gray-300 mx-1 shrink-0" aria-hidden="true" />;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 220 }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string>("");
  const colorInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    if (ref.current && value !== lastValue.current) {
      ref.current.innerHTML = value || "";
      lastValue.current = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastValue.current = html;
    onChange(html);
  };

  const exec = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const toggleQuote = () => {
    ref.current?.focus();
    const current = document.queryCommandValue("formatBlock");
    if (current && current.toLowerCase() === "blockquote") {
      document.execCommand("formatBlock", false, "p");
    } else {
      document.execCommand("formatBlock", false, "blockquote");
    }
    handleInput();
  };

  // Buka dialog warna bawaan browser -- posisi kursor/seleksi disimpan
  // dulu karena fokus akan berpindah ke <input type="color">, yang
  // membuat browser membatalkan seleksi teks di dalam editor.
  const openColorPicker = () => {
    const sel = window.getSelection();
    savedRangeRef.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    colorInputRef.current?.click();
  };

  const applyColor = (color: string) => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    // `styleWithCSS` dinyalakan cuma sebentar khusus untuk perintah warna
    // ini, supaya hasilnya berupa <span style="color:..."> (cocok dengan
    // allowlist sanitizer) tanpa mengubah cara bold/italic/underline
    // biasanya dihasilkan (tag <b>/<i>/<u>).
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, color);
    document.execCommand("styleWithCSS", false, "false");
    handleInput();
  };

  // Sisipkan tautan -- URL diminta lewat prompt() karena dialog itu juga
  // memindahkan fokus keluar dari editor, jadi seleksi teks disimpan dulu
  // dan dipulihkan sebelum createLink dijalankan. Setelah link dibuat,
  // atribut target/rel ditambahkan manual supaya link selalu buka tab baru
  // dengan aman (browser tidak menyediakan opsi ini lewat execCommand).
  const insertLink = () => {
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    const url = window.prompt("Masukkan URL tautan (contoh: https://situs-contoh.com)");
    if (!url) return;
    ref.current?.focus();
    if (sel && range) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand("createLink", false, url);
    ref.current?.querySelectorAll("a:not([data-rte-linked])").forEach((a) => {
      if (a.getAttribute("href") === url) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        a.setAttribute("data-rte-linked", "1");
      }
    });
    handleInput();
  };

  const isEmpty = !value || value === "<br>";

  return (
    <div>
      <div className="flex items-center gap-1 border border-gray-300 border-b-0 rounded-t-lg bg-gray-50 px-1.5 py-1 flex-wrap">
        <ToolbarButton label="Tebal" onClick={() => exec("bold")} className="font-bold text-sm">
          B
        </ToolbarButton>
        <ToolbarButton label="Miring" onClick={() => exec("italic")} className="italic text-sm">
          I
        </ToolbarButton>
        <ToolbarButton label="Garis Bawah" onClick={() => exec("underline")} className="underline text-sm">
          U
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton label="Rata Kiri" onClick={() => exec("justifyLeft")}>
          <IconAlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Rata Tengah" onClick={() => exec("justifyCenter")}>
          <IconAlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Rata Kanan" onClick={() => exec("justifyRight")}>
          <IconAlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Rata Kiri-Kanan" onClick={() => exec("justifyFull")}>
          <IconAlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton label="Daftar Bullet" onClick={() => exec("insertUnorderedList")}>
          <IconListBullet className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Daftar Bernomor" onClick={() => exec("insertOrderedList")}>
          <IconListNumber className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton label="Kutipan" onClick={toggleQuote}>
          <IconQuote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton label="Sisipkan Tautan" onClick={insertLink}>
          <IconLinkGlyph className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton label="Warna Teks" onClick={openColorPicker}>
          <IconTextColor className="w-4 h-4" />
        </ToolbarButton>
        <input
          ref={colorInputRef}
          type="color"
          defaultValue="#1f2937"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => applyColor(e.target.value)}
        />
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <span className="absolute left-3 top-2.5 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          style={{ minHeight }}
          className={`input !rounded-t-none text-sm leading-relaxed focus:outline-none ${ARTICLE_CONTENT_CLASSNAME}`}
        />
      </div>
    </div>
  );
}
