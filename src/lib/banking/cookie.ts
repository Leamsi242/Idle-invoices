import type { Institution } from "./types";

/** Remembers, for 15 minutes, which bank the user went to sign in to and the random state. */
export const BANK_COOKIE = "sd_bank";

/** `days`: how long a watched access lasts, as agreed with the bank when the connection started. */
export const encodePending = (state: string, institution: Institution, watch = false, days?: number) =>
  Buffer.from(JSON.stringify({ state, ...institution, watch, days })).toString("base64url");

export function decodePending(value: string | undefined): { state: string; institution: Institution; watch: boolean; days?: number } | null {
  if (!value) return null;
  try {
    const v = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof v.state !== "string" || typeof v.name !== "string" || typeof v.country !== "string") return null;
    const days = Number.isInteger(v.days) && v.days > 0 ? (v.days as number) : undefined;
    return { state: v.state, institution: { name: v.name, country: v.country }, watch: v.watch === true, days };
  } catch {
    return null;
  }
}
