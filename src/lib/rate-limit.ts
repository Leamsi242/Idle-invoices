/**
 * Fixed-window rate limiter kept in memory. Good enough for the prototype; on Vercel each
 * function instance has its own counters, so move this to a shared store (Redis, Upstash)
 * before a public launch.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfter: number } {
  const w = windows.get(key);
  if (!w || now >= w.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    if (windows.size > 10_000) for (const [k, v] of windows) if (now >= v.resetAt) windows.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  w.count++;
  return { ok: w.count <= limit, retryAfter: Math.ceil((w.resetAt - now) / 1000) };
}
