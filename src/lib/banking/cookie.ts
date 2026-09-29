import type { Institution } from "./types";

/** The longest watch the app asks for (index.ts re-exports it). */
export const WATCH_DAYS = 90;

/** Remembers, for 15 minutes, which bank the user went to sign in to and the random state. */
export const BANK_COOKIE = "sd_bank";

/**
 * `days`: how long a watched access lasts, as agreed with the bank when the connection started.
 * `ctx`: what the provider needs back (a Powens token, a Bridge user), already encrypted.
 */
export const encodePending = (state: string, institution: Institution, watch = false, days?: number, ctx?: string) =>
  Buffer.from(JSON.stringify({ state, ...institution, watch, days, ...(ctx ? { ctx } : {}) })).toString("base64url");

export function decodePending(value: string | undefined): { state: string; institution: Institution; watch: boolean; days?: number; ctx?: string } | null {
  if (!value) return null;
  try {
    const v = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof v.state !== "string" || typeof v.name !== "string" || typeof v.country !== "string") return null;
    // The cookie is not signed: never trust a longer watch than the app itself would ask for.
    const days = Number.isInteger(v.days) && v.days > 0 ? Math.min(v.days as number, WATCH_DAYS) : undefined;
    return { state: v.state, institution: { name: v.name, country: v.country }, watch: v.watch === true, days, ...(typeof v.ctx === "string" ? { ctx: v.ctx } : {}) };
  } catch {
    return null;
  }
}
