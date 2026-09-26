import type { Institution } from "./types";

/** Remembers, for 15 minutes, which bank the user went to sign in to and the random state. */
export const BANK_COOKIE = "sd_bank";

export const encodePending = (state: string, institution: Institution) => Buffer.from(JSON.stringify({ state, ...institution })).toString("base64url");

export function decodePending(value: string | undefined): { state: string; institution: Institution } | null {
  if (!value) return null;
  try {
    const v = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof v.state !== "string" || typeof v.name !== "string" || typeof v.country !== "string") return null;
    return { state: v.state, institution: { name: v.name, country: v.country } };
  } catch {
    return null;
  }
}
