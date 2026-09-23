import { NextResponse } from "next/server";
import { NeedsMappingError, parseFile, parseText, type ColumnMapping } from "@/lib/parsers";
import { getOrCreateSessionId } from "@/lib/session";
import { purgeExpired, recompute, saveUpload } from "@/lib/store";
import { maskSensitive } from "@/lib/mask";

export const runtime = "nodejs";

const MAX_FILES = 20;
// Vercel limits request bodies to 4.5 MB; keep each file well under that.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const parseJson = <T,>(value: FormDataEntryValue | null, fallback: T): T => {
  try {
    return typeof value === "string" ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const hints = parseJson<Record<string, "apple" | "google" | "email">>(form.get("hints"), {});
  const mappings = parseJson<Record<string, ColumnMapping>>(form.get("mappings"), {});
  const pastedText = form.get("pastedText");
  const pastedHint = form.get("pastedHint");

  if (files.length > MAX_FILES) return NextResponse.json({ error: `Up to ${MAX_FILES} files at a time.` }, { status: 400 });
  const sessionId = await getOrCreateSessionId();

  const results: { fileName: string; source: string; count: number }[] = [];
  const needsMapping: { fileName: string; headers: string[]; preview: string[][] }[] = [];
  const errors: { fileName: string; error: string }[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      errors.push({ fileName: file.name, error: "File is larger than 4 MB." });
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
      else errors.push({ fileName: file.name, error: e instanceof Error ? e.message : "Could not read this file." });
    } finally {
      data.fill(0);
    }
  }

  if (typeof pastedText === "string" && pastedText.trim()) {
    const hint = pastedHint === "google" || pastedHint === "email" ? pastedHint : "apple";
    try {
      const parsed = parseText(pastedText.slice(0, 50_000), { hint });
      await saveUpload(sessionId, `pasted ${hint} text`, parsed.source, parsed.transactions);
      results.push({ fileName: "Pasted text", source: parsed.source, count: parsed.transactions.length });
    } catch (e) {
      errors.push({ fileName: "Pasted text", error: e instanceof Error ? e.message : "Could not read the text." });
    }
  }

  const { subscriptions } = await recompute(sessionId);
  await purgeExpired().catch(() => 0);
  return NextResponse.json({ results, needsMapping, errors, subscriptions });
}
