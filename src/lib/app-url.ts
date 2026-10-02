/**
 * The site's own address, for links that leave it (sign-in e-mails, Stripe's return pages). In
 * production it must come from APP_URL, never from the request's Host header, which a caller sets.
 */
export function appUrlFor(req: Request): string | null {
  const url = process.env.APP_URL ?? (process.env.NODE_ENV === "production" ? null : new URL(req.url).origin);
  return url ? url.replace(/\/$/, "") : null;
}
