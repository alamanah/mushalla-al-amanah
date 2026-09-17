import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { driveImageUrl } from "../../lib/driveLink";
import { InfaqInfo, InfaqRekening } from "../../types";

/**
 * Versi "bersusun atas-bawah" & lebih besar dari InfaqCard.tsx (yang di
 * beranda pakai grid 2 kolom berdampingan) -- khusus halaman Layar TV supaya
 * QRIS-nya cukup besar untuk dipindai langsung dari jarak jamaah berdiri/
 * duduk di depan TV.
 */
export default function InfaqPanelTv() {
  const [info, setInfo] = useState<InfaqInfo | null>(null);
  const [rekening, setRekening] = useState<InfaqRekening[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("infaq_info").select("*").limit(1).maybeSingle(),
      supabase.from("infaq_rekening").select("*").order("sort_order", { ascending: true }),
    ]).then(([infoRes, rekRes]) => {
      setInfo(infoRes.data as InfaqInfo | null);
      setRekening((rekRes.data as InfaqRekening[]) ?? []);
      setLoading(false);
    });
  }, []);

  const hasContent = Boolean(info?.description || info?.ewallet_name || info?.qr_image_url || rekening.length > 0);
  const infoQris = driveImageUrl(info?.qr_image_url);

  return (
    <div>
      <h2 className="font-serif font-bold text-3xl text-primary-900 mb-2">Infaq &amp; Shadaqah</h2>
      {info?.description && <p className="text-gray-600 text-lg mb-6">{info.description}</p>}
      {loading && <p className="text-gray-400 text-lg">Memuat info infaq...</p>}
      {!loading && !hasContent && <p className="text-gray-400 text-lg">Info rekening infaq belum diisi.</p>}

      <div className="space-y-5">
        {rekening.map((r) => {
          const qris = driveImageUrl(r.qris_url);
          return (
            <div
              key={r.id}
              className="rounded-3xl bg-primary-50 border border-primary-100 p-6 flex items-center justify-between gap-6"
            >
              <div className="min-w-0">
                <p className="text-sm text-primary-700 font-medium mb-1">Transfer Bank</p>
                <p className="font-bold text-2xl text-gray-800">{r.bank_name}</p>
                <p className="text-3xl font-bold text-primary-900 tracking-wide mt-1">{r.account_number}</p>
                {r.account_holder && <p className="text-base text-gray-500 mt-1">a.n. {r.account_holder}</p>}
              </div>
              {qris && (
                <img
                  src={qris}
                  alt={`QRIS ${r.bank_name}`}
                  className="w-40 h-40 object-contain shrink-0 rounded-xl bg-white border border-primary-100 p-2"
                />
              )}
            </div>
          );
        })}

        {info?.ewallet_name && (
          <div className="rounded-3xl bg-primary-50 border border-primary-100 p-6">
            <p className="text-sm text-primary-700 font-medium mb-1">E-Wallet</p>
            <p className="font-bold text-2xl text-gray-800">{info.ewallet_name}</p>
            <p className="text-3xl font-bold text-primary-900 tracking-wide mt-1">{info.ewallet_number}</p>
          </div>
        )}

        {infoQris && (
          <div className="rounded-3xl bg-primary-50 border border-primary-100 p-6 flex flex-col items-center">
            <p className="text-sm text-primary-700 font-medium mb-3">QRIS Infaq</p>
            <img src={infoQris} alt="QRIS Infaq" className="w-56 h-56 object-contain bg-white rounded-xl p-2" />
          </div>
        )}
      </div>
    </div>
  );
}
