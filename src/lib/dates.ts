const MONTHS: Record<string, number> = {
  jan: 1, january: 1, janvier: 1, feb: 2, february: 2, fevrier: 2, février: 2, mar: 3, march: 3, mars: 3,
  apr: 4, april: 4, avril: 4, may: 5, mai: 5, jun: 6, june: 6, juin: 6, jul: 7, july: 7, juillet: 7,
  aug: 8, august: 8, aout: 8, août: 8, sep: 9, sept: 9, september: 9, septembre: 9, oct: 10, october: 10,
  octobre: 10, nov: 11, november: 11, novembre: 11, dec: 12, december: 12, decembre: 12, décembre: 12,
  janv: 1, févr: 2, fév: 2, fevr: 2, avr: 4, juil: 7, déc: 12,
};

export type DateOrder = "DMY" | "MDY" | "YMD";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
};

/** Parses "2026-03-05", "05/03/2026", "05.03.26", "5 March 2026", "March 5, 2026". Returns YYYY-MM-DD or null. */
export function parseDate(input: string, order: DateOrder = "DMY"): string | null {
  const s = input.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) return order === "MDY" ? iso(+m[3], +m[1], +m[2]) : iso(+m[3], +m[2], +m[1]);
  m = s.match(/(\d{1,2})(?:st|nd|rd|th|er)?\s+([A-Za-zéû]+)\.?,?\s+(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return iso(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = s.match(/([A-Za-zéû]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (m && MONTHS[m[1].toLowerCase()]) return iso(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  return null;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}
