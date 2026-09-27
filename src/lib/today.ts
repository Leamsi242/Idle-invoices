import { cookies } from "next/headers";

/** The visitor's time zone, set by the browser (components/TimeZone.tsx). */
export const TZ_COOKIE = "sd_tz";
const VALID_TZ = /^[A-Za-z]+(?:[/_+-][A-Za-z0-9]+)*$/;

/** A date as YYYY-MM-DD in a time zone: at 1:00 in Paris it is already tomorrow, not yet in UTC. */
export function localDate(date: Date, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone && VALID_TZ.test(timeZone) ? timeZone : "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Today where the visitor is (Paris until the browser has said otherwise). */
export async function today(): Promise<string> {
  return localDate(new Date(), (await cookies()).get(TZ_COOKIE)?.value);
}
