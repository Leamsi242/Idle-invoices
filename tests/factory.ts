import type { NormalizedTransaction, Source } from "@/lib/types";
import { addDays, addMonths } from "@/lib/dates";

let n = 0;
export function tx(date: string, amount: number, rawLabel: string, source: Source = "bank", extra: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  return { id: `t${++n}`, date, amount, currency: "EUR", rawLabel, source, ...extra };
}

export const monthlySeries = (start: string, count: number, amount: number | ((i: number) => number), label: string, skip: number[] = []) =>
  Array.from({ length: count }, (_, i) => i)
    .filter((i) => !skip.includes(i))
    .map((i) => tx(addMonths(start, i), typeof amount === "number" ? amount : amount(i), label));

export const weeklySeries = (start: string, count: number, amount: number, label: string) =>
  Array.from({ length: count }, (_, i) => tx(addDays(start, 7 * i), amount, label));
