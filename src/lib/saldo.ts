import { FinancialTransaction } from "../types";

export interface TransactionWithSaldo extends FinancialTransaction {
  saldo: number;
}

/**
 * Urutkan transaksi berdasarkan tanggal (baris "Saldo Awal" tanpa tanggal
 * dianggap paling awal), lalu hitung saldo berjalan:
 * saldo_n = (saldo_(n-1) + debet_n) - kredit_n
 */
export function computeRunningSaldo(transactions: FinancialTransaction[]): TransactionWithSaldo[] {
  const sorted = [...transactions].sort((a, b) => {
    if (a.tanggal === b.tanggal) return 0;
    if (a.tanggal === null) return -1;
    if (b.tanggal === null) return 1;
    return a.tanggal.localeCompare(b.tanggal);
  });
  let running = 0;
  return sorted.map((t) => {
    running = running + Number(t.debet) - Number(t.kredit);
    return { ...t, saldo: running };
  });
}

/** Saldo dihitung terpisah per Jenis rekening (BRI/BSI/UP Tunai masing-masing punya saldo sendiri). */
export function computeRunningSaldoByJenis(
  transactions: FinancialTransaction[]
): Record<string, TransactionWithSaldo[]> {
  const groups: Record<string, FinancialTransaction[]> = {};
  for (const t of transactions) {
    (groups[t.jenis] ??= []).push(t);
  }
  const result: Record<string, TransactionWithSaldo[]> = {};
  for (const jenis of Object.keys(groups)) {
    result[jenis] = computeRunningSaldo(groups[jenis]);
  }
  return result;
}
