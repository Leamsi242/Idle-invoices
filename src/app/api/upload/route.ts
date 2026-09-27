import { NextResponse } from "next/server";
import { NeedsMappingError, parseFile, parseText, type ColumnMapping } from "@/lib/parsers";
import { getOrCreateSessionId } from "@/lib/session";
import { purgeExpired, recompute, saveUpload } from "@/lib/store";
import { maskSensitive } from "@/lib/mask";
import { rateLimit } from "@/lib/rate-limit";
import { getLocale } from "@/lib/locale";
import type { Locale } from "@/lib/i18n";

const TEXTS = {
  en: {
    tooMany: "Too many uploads. Please wait a few minutes.",
    maxFiles: (n: number) => `Up to ${n} files at a time.`,
    tooBig: "File is larger than 4 MB.",
    pasted: "Pasted text",
    unreadable: "Could not read this file. Try a CSV export, or check that it is a statement, PayPal export, receipt or app store list.",
    noKey: "Screenshots cannot be read on this server. You can paste the text instead.",
    refused: "The screenshot could not be read. Please paste the text instead.",
  },
  fr: {
    tooMany: "Trop d'envois. Patientez quelques minutes.",
    maxFiles: (n: number) => `${n} fichiers au maximum à la fois.`,
    tooBig: "Le fichier dépasse 4 Mo.",
    pasted: "Texte collé",
    unreadable: "Impossible de lire ce fichier. Essayez un export CSV, ou vérifiez qu'il s'agit d'un relevé, d'un export PayPal, d'un reçu ou d'une liste d'abonnements de magasin d'applications.",
    noKey: "Les captures d'écran ne peuvent pas être lues sur ce serveur. Vous pouvez coller le texte à la place.",
    refused: "La capture d'écran n'a pas pu être lue. Collez plutôt le texte.",
  },
};

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILES = 20;
// Vercel limits request bodies to 4.5 MB; keep each file well under that.
const MAX_FILE_BYTES = 4 * 1024 * 1024;
// Each upload can call the Claude API (screenshots), so cap how often one visitor can post.
const UPLOADS_PER_WINDOW = 20;
const WINDOW_MS = 10 * 60 * 1000;

const parseJson = <T,>(value: FormDataEntryValue | null, fallback: T): T => {
  try {
    return typeof value === "string" ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Only our own, user-facing messages go back to the browser; internal errors stay generic. */
function userMessage(e: unknown, locale: Locale): string {
  const t = TEXTS[locale];
  if (e instanceof Error && /ANTHROPIC_API_KEY/.test(e.message)) return t.noKey;
  if (e instanceof Error && /paste the text/.test(e.message)) return t.refused;
  return t.unreadable;
}

export async function POST(req: Request) {
  const locale = await getLocale();
  const t = TEXTS[locale];
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = rateLimit(`upload:${ip}`, UPLOADS_PER_WINDOW, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json({ error: t.tooMany }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const hints = parseJson<Record<string, "apple" | "google" | "email">>(form.get("hints"), {});
  const mappings = parseJson<Record<string, ColumnMapping>>(form.get("mappings"), {});
  const pastedText = form.get("pastedText");
  const pastedHint = form.get("pastedHint");

  if (files.length > MAX_FILES) return NextResponse.json({ error: t.maxFiles(MAX_FILES) }, { status: 400 });
  const sessionId = await getOrCreateSessionId();

  const results: { fileName: string; source: string; count: number }[] = [];
  const needsMapping: { fileName: string; headers: string[]; preview: string[][] }[] = [];
  const errors: { fileName: string; error: string }[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      errors.push({ fileName: file.name, error: t.tooBig });
      continue;
    }
    // The file only ever exists in this buffer. It is parsed, then wiped and dropped.
    const data = Buffer.from(await file.arrayBuffer());
    try {
      const parsed = await parseFile(file.name, file.type, data, { hint: hints[file.name], mapping: mappings[file.name] });
      await saveUpload(sessionId, file.name, parsed.source, parsed.transactions);
      results.push({ fileName: file.name, source: parsed.source, count: parsed.transactions.length });
    } catch (e) {
      if (e instanceof NeedsMappingError) needsMapping.push({ fileName: file.name, headers: e.headers, preview: e.preview.map((r) => r.map(maskSensitive)) });
      else errors.push({ fileName: file.name, error: userMessage(e, locale) });
    } finally {
      data.fill(0);
    }
  }

  if (typeof pastedText === "string" && pastedText.trim()) {
    const hint = pastedHint === "google" || pastedHint === "email" ? pastedHint : "apple";
    try {
      const parsed = parseText(pastedText.slice(0, 50_000), { hint });
      await saveUpload(sessionId, `pasted ${hint} text`, parsed.source, parsed.transactions);
      results.push({ fileName: t.pasted, source: parsed.source, count: parsed.transactions.length });
    } catch (e) {
      errors.push({ fileName: t.pasted, error: userMessage(e, locale) });
    }
  }

  const { subscriptions } = await recompute(sessionId);
  await purgeExpired().catch(() => 0);
  return NextResponse.json({ results, needsMapping, errors, subscriptions });
}
