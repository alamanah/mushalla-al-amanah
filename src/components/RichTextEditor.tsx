import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function ToolbarButton({
  command,
  label,
  className,
  onExec,
}: {
  command: string;
  label: string;
  className?: string;
  onExec: (command: string) => void;
}) {
  return (
    <button
      type="button"
      // preventDefault di mousedown penting -- kalau tidak, klik tombol
      // ini bikin fokus & seleksi teks di editor hilang duluan sebelum
      // execCommand sempat jalan, jadi formatnya tidak kena ke teks yang
      // sedang dipilih.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onExec(command)}
      className={`h-7 w-7 rounded hover:bg-gray-200 text-sm text-gray-700 flex items-center justify-center ${className ?? ""}`}
      title={label}
      aria-label={label}
    >
      {label}
    </button>
  );
}

/** Textbox isi artikel dengan format dasar (Bold/Italic/Underline) --
 * sengaja dibuat sendiri pakai <div contentEditable> + document.execCommand
 * (bukan library WYSIWYG pihak ketiga) supaya ringan dan tidak nambah
 * dependency besar cuma untuk 3 tombol format. Isinya disimpan sebagai HTML
 * lewat onChange, lalu WAJIB disaring (lihat lib/sanitizeHtml.ts) sebelum
 * disimpan ke database maupun ditampilkan.
 *
 * innerHTML cuma disinkronkan ulang dari `value` kalau perubahannya datang
 * dari LUAR (mis. baru selesai memuat data artikel yang mau diubah) --
 * kalau disetel ulang tiap kali user mengetik, posisi kursornya akan
 * meloncat ke awal setiap huruf. */
export default function RichTextEditor({ value, onChange, placeholder, minHeight = 220 }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string>("");

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

  const exec = (command: string) => {
    ref.current?.focus();
    document.execCommand(command);
    handleInput();
  };

  const isEmpty = !value || value === "<br>";

  return (
    <div>
      <div className="flex items-center gap-1 border border-gray-300 border-b-0 rounded-t-lg bg-gray-50 px-1.5 py-1">
        <ToolbarButton command="bold" label="B" className="font-bold" onExec={exec} />
        <ToolbarButton command="italic" label="I" className="italic" onExec={exec} />
        <ToolbarButton command="underline" label="U" className="underline" onExec={exec} />
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
          className="input !rounded-t-none text-sm leading-relaxed [&_p]:my-1 focus:outline-none"
        />
      </div>
    </div>
  );
}
