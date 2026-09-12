import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { driveImageUrl } from "../lib/driveLink";
import { InfaqInfo, InfaqRekening } from "../types";
import ImageLightbox from "./ImageLightbox";

export default function InfaqCard() {
  const [info, setInfo] = useState<InfaqInfo | null>(null);
  const [rekening, setRekening] = useState<InfaqRekening[]>([]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("infaq_info")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setInfo(data as InfaqInfo | null));
    supabase
      .from("infaq_rekening")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setRekening((data as InfaqRekening[]) ?? []));
  }, []);

  const hasContent = Boolean(info?.description || info?.ewallet_name || info?.qr_image_url || rekening.length > 0);
  if (!hasContent) return null;

  const infoQris = driveImageUrl(info?.qr_image_url);

  return (
    <div className="panel">
      <h3 className="font-serif font-bold text-lg text-primary-900 mb-3">Infaq &amp; Shadaqah</h3>
      {info?.description && <p className="text-sm text-gray-600 mb-3">{info.description}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {rekening.map((r) => {
          const qris = driveImageUrl(r.qris_url);
          return (
            <div key={r.id} className="bg-primary-50 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-primary-700 font-medium mb-1">Transfer Bank</p>
                <p className="font-semibold text-gray-800">{r.bank_name}</p>
                <p className="text-lg font-bold text-primary-900 tracking-wide">{r.account_number}</p>
                {r.account_holder && <p className="text-xs text-gray-500">a.n. {r.account_holder}</p>}
              </div>
              {qris && (
                <img
                  src={qris}
                  alt={`QRIS ${r.bank_name}`}
                  onClick={() => setPreviewSrc(qris)}
                  className="w-20 h-20 object-contain shrink-0 rounded-md bg-white border border-primary-100 p-1 cursor-zoom-in hover:opacity-80 transition-opacity"
                />
              )}
            </div>
          );
        })}
        {info?.ewallet_name && (
          <div className="bg-primary-50 rounded-lg p-3">
            <p className="text-xs text-primary-700 font-medium mb-1">E-Wallet</p>
            <p className="font-semibold text-gray-800">{info.ewallet_name}</p>
            <p className="text-lg font-bold text-primary-900 tracking-wide">{info.ewallet_number}</p>
          </div>
        )}
      </div>
      {infoQris && (
        <img
          src={infoQris}
          alt="QRIS Infaq"
          onClick={() => setPreviewSrc(infoQris)}
          className="mt-4 w-40 h-40 object-contain mx-auto cursor-zoom-in hover:opacity-80 transition-opacity"
        />
      )}
      {previewSrc && <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />}
    </div>
  );
}
