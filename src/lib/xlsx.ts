/**
 * A minimal reader for the first sheet of an .xlsx file: enough for exports such as PayPal's
 * personal data download, without a spreadsheet library. An .xlsx is a zip of XML files; entries
 * are stored or deflated, and DecompressionStream inflates them in the browser and in Node.
 */

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/** The files of a zip, by name, from its central directory. */
function zipEntries(b: Uint8Array): Map<string, { method: number; offset: number; size: number }> {
  // The end of central directory record sits in the last 64 KB.
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Not a zip file");
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  const out = new Map<string, { method: number; offset: number; size: number }>();
  for (let n = 0; n < count && u32(b, p) === 0x02014b50; n++) {
    const method = u16(b, p + 10), size = u32(b, p + 20), nameLen = u16(b, p + 28), extraLen = u16(b, p + 30), commentLen = u16(b, p + 32), local = u32(b, p + 42);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nameLen));
    // The data starts after the local header, whose name and extra lengths may differ from the central ones.
    const offset = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    out.set(name, { method, offset, size });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(b: Uint8Array, entries: ReturnType<typeof zipEntries>, name: string): Promise<string | null> {
  const e = entries.get(name);
  if (!e) return null;
  const raw = b.subarray(e.offset, e.offset + e.size);
  const data = e.method === 0 ? raw : e.method === 8 ? await inflate(raw) : null;
  if (!data) throw new Error(`Unsupported zip compression (${e.method})`);
  return new TextDecoder().decode(data);
}

const unescapeXml = (s: string) =>
  s.replace(/&(?:lt|gt|quot|apos|amp|#(\d+)|#x([0-9a-f]+));/gi, (m, dec?: string, hex?: string) =>
    dec ? String.fromCodePoint(Number(dec)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : ({ "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&amp;": "&" } as Record<string, string>)[m]);

/** The text of an <si> or <is> element: every <t>, joined (rich text splits a string in runs). */
const textOf = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join("");

/** "AB" -> 27 (zero-based column index from a cell reference such as "AB12"). */
const columnIndex = (ref: string) => [...ref.replace(/\d+$/, "")].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** Rows of the first worksheet, as text cells. */
export async function readXlsxRows(bytes: Uint8Array): Promise<string[][]> {
  const entries = zipEntries(bytes);
  const shared = await readEntry(bytes, entries, "xl/sharedStrings.xml");
  const strings = shared ? [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : [];
  const sheetName = [...entries.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))[0];
  const sheet = sheetName ? await readEntry(bytes, entries, sheetName) : null;
  if (!sheet) throw new Error("No worksheet found");
  const rows: string[][] = [];
  for (const row of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], body = c[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const type = attrs.match(/\bt="(\w+)"/)?.[1];
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const value = type === "s" ? strings[Number(v)] ?? "" : type === "inlineStr" ? textOf(body) : v !== undefined ? unescapeXml(v) : "";
      const at = ref ? columnIndex(ref) : cells.length;
      while (cells.length < at) cells.push("");
      cells[at] = value;
    }
    rows.push(cells);
  }
  return rows;
}

/** An .xlsx starts like any zip: "PK\x03\x04". */
export const looksLikeXlsx = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4;
