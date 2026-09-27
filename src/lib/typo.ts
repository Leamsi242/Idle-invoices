/**
 * French typography for a whole dictionary: a space that never breaks before « : » (no-break
 * space) and before « ; ? ! % » (narrow no-break space), and inside « ». Texts are written with
 * plain spaces; this keeps "?" or "»" from starting a line on its own.
 */
export function frenchSpaces(text: string): string {
  return text
    .replace(/ :(?=\s|$)/g, " :")
    .replace(/ ([;?!%])/g, " $1")
    .replace(/« /g, "« ")
    .replace(/ »/g, " »")
    .replace(/(\d) €/g, "$1 €");
}

type Deep<T> = T;

/** Applies `frenchSpaces` to every string in a dictionary, including what its functions return. */
export function withFrenchSpaces<T>(dict: T): Deep<T> {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return frenchSpaces(v);
    if (typeof v === "function") {
      const f = v as (...args: unknown[]) => unknown;
      return (...args: unknown[]) => walk(f(...args));
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(dict) as T;
}
