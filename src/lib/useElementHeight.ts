import { useEffect, useRef, useState } from "react";

/** Ukur tinggi (px) elemen secara reaktif lewat ResizeObserver -- dipakai
 * supaya card Jadwal Kajian di beranda bisa mengikuti tinggi card Jadwal
 * Khatib Jumat (lihat Landing.tsx). */
export function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, height] as const;
}

/** true kalau lebar layar >= breakpoint (default 768px, sama dengan `md:`
 * Tailwind) -- dipakai supaya penyamaan tinggi card kajian/khatib cuma
 * berlaku saat keduanya ditampilkan berdampingan (2 kolom), bukan saat
 * ditumpuk di layar HP. */
export function useIsDesktop(breakpointPx = 768): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(min-width: ${breakpointPx}px)`).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const handler = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpointPx]);
  return isDesktop;
}
