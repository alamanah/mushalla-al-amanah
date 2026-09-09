import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { InfaqInfo } from "../types";

export default function InfaqCard() {
  const [info, setInfo] = useState<InfaqInfo | null>(null);

  useEffect(() => {
    supabase
      .from("infaq_info")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setInfo(data as InfaqInfo | null));
  }, []);

  if (!info) return null;

  return (
    <div className="card">
      <h3 className="font-serif font-bold text-lg text-primary-900 mb-3">Infaq &amp; Shadaqah</h3>
      {info.description && <p className="text-sm text-gray-600 mb-3">{info.description}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {info.bank_name && (
          <div className="bg-primary-50 rounded-lg p-3">
            <p className="text-xs text-primary-700 font-medium mb-1">Transfer Bank</p>
            <p className="font-semibold text-gray-800">{info.bank_name}</p>
            <p className="text-lg font-bold text-primary-900 tracking-wide">{info.account_number}</p>
            <p className="text-xs text-gray-500">a.n. {info.account_holder}</p>
          </div>
        )}
        {info.ewallet_name && (
          <div className="bg-primary-50 rounded-lg p-3">
            <p className="text-xs text-primary-700 font-medium mb-1">E-Wallet</p>
            <p className="font-semibold text-gray-800">{info.ewallet_name}</p>
            <p className="text-lg font-bold text-primary-900 tracking-wide">{info.ewallet_number}</p>
          </div>
        )}
      </div>
      {info.qr_image_url && (
        <img src={info.qr_image_url} alt="QRIS Infaq" className="mt-4 w-40 h-40 object-contain mx-auto" />
      )}
    </div>
  );
}
