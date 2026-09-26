import { timingSafeEqual } from "node:crypto";

/** Vercel cron calls carry "Authorization: Bearer <CRON_SECRET>"; without the secret set, nothing runs. */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
