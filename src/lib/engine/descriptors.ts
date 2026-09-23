import builtIn from "@/data/descriptors.json";
import type { DescriptorEntry } from "../types";
import { nameKey } from "./labels";

export const BUILT_IN_DESCRIPTORS: DescriptorEntry[] = builtIn;

/**
 * Step 3 of the core logic: maps a cryptic label (or a reconciled merchant) to a known
 * service. User-provided descriptors are checked first, then the built-in map; within each,
 * the longest pattern wins so "APPLE ONE" beats "APPLE".
 */
export function findDescriptor(texts: (string | undefined)[], userDescriptors: DescriptorEntry[] = []): DescriptorEntry | undefined {
  const keys = texts.filter((t): t is string => !!t).map((t) => ` ${nameKey(t)} `);
  const byLength = (list: DescriptorEntry[]) => [...list].sort((a, b) => nameKey(b.pattern).length - nameKey(a.pattern).length);
  for (const list of [byLength(userDescriptors), byLength(BUILT_IN_DESCRIPTORS)]) {
    for (const d of list) {
      const p = ` ${nameKey(d.pattern)} `;
      if (p.trim() && keys.some((k) => k.includes(p))) return d;
    }
  }
  return undefined;
}

/** What to save when the user answers "what is this charge?": the cleaned label becomes the pattern. */
export function descriptorFromAnswer(labelKey: string, serviceName: string, cancellationUrl?: string): DescriptorEntry {
  const known = findDescriptor([serviceName]);
  return {
    pattern: labelKey,
    serviceName: known?.serviceName ?? serviceName.trim(),
    category: known?.category,
    cancellationUrl: cancellationUrl?.trim() || known?.cancellationUrl,
    bundle: known?.bundle,
  };
}
