/**
 * Builds a calendar file (.ics) for a reminder. It is generated in the browser and opened by
 * the phone's calendar app, so reminders work without an account or an email address.
 */
export interface Reminder {
  uid: string;
  title: string;
  date: string; // YYYY-MM-DD, all-day event
  description: string;
  url?: string;
}

const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
const compact = (d: string) => d.replace(/-/g, "");
const nextDay = (d: string) => new Date(Date.parse(d) + 86_400_000).toISOString().slice(0, 10);

const bytes = (s: string) => new TextEncoder().encode(s).length;

/** Folds lines longer than 75 octets, as the iCalendar format requires. Runs in the browser. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (bytes(rest) > 75) {
    let cut = 75;
    while (bytes(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(r: Reminder, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Subscription Detective//Reminders//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${r.uid}@subscription-detective`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(r.date)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(r.date))}`,
    `SUMMARY:${escape(r.title)}`,
    `DESCRIPTION:${escape(r.description + (r.url ? `\n${r.url}` : ""))}`,
    ...(r.url ? [`URL:${r.url}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(r.title)}`,
    "TRIGGER:PT9H", // 9:00 on the day of the event
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);

/** Two days before a trial ends: enough time to cancel. */
export function trialReminder(serviceName: string, endsOn: string, price?: string, url?: string): Reminder {
  return {
    uid: `trial-${serviceName}-${endsOn}`.replace(/[^A-Za-z0-9-]/g, ""),
    title: `Cancel the ${serviceName} trial? It ends on ${endsOn}`,
    date: addDays(endsOn, -2),
    description: `Your free trial of ${serviceName} ends on ${endsOn}.${price ? ` After that you pay ${price}.` : ""} Cancel now if you don't want to keep it.`,
    url,
  };
}

/** Three days before the next expected charge. */
export function renewalReminder(serviceName: string, nextCharge: string, price: string, url?: string): Reminder {
  return {
    uid: `renewal-${serviceName}-${nextCharge}`.replace(/[^A-Za-z0-9-]/g, ""),
    title: `${serviceName} charges ${price} on ${nextCharge}`,
    date: addDays(nextCharge, -3),
    description: `${serviceName} is expected to charge ${price} around ${nextCharge}. Still using it? If not, cancel before then.`,
    url,
  };
}
