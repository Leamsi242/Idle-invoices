import { LOGO_DOMAINS } from "@/lib/brand";

export const runtime = "nodejs";

const MAX_BYTES = 300_000;

/**
 * The favicon of a known service, fetched by the server and cached by the CDN for a month: the
 * user's browser never tells a third party which services they pay for. Only domains of known
 * services and banks are fetched.
 */
export async function GET(_: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  if (!LOGO_DOMAINS.has(domain)) return new Response(null, { status: 404 });
  const sources = [
    `https://www.${domain}/apple-touch-icon.png`,
    `https://${domain}/apple-touch-icon.png`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000), redirect: "follow" });
      const type = res.headers.get("content-type") ?? "";
      // SVG could carry scripts when served from our own origin: bitmaps only.
      if (!res.ok || !type.startsWith("image/") || type.includes("svg")) continue;
      const body = await res.arrayBuffer();
      if (body.byteLength === 0 || body.byteLength > MAX_BYTES) continue;
      return new Response(body, {
        headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" },
      });
    } catch {
      // Next source.
    }
  }
  return new Response(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=86400" } });
}
