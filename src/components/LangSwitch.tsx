"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "./I18n";

/** "English" / "Français": remembers the choice and comes back to the same page. */
export function LangSwitch() {
  const { m } = useI18n();
  const path = usePathname() || "/";
  return (
    <a href={`/api/lang?l=${m.switchTo.locale}&back=${encodeURIComponent(path)}`} className="underline" hrefLang={m.switchTo.locale} lang={m.switchTo.locale}>
      {m.switchTo.label}
    </a>
  );
}
