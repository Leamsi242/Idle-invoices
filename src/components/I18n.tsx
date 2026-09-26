"use client";

import { createContext, useContext } from "react";
import { messages, type Locale, type Messages } from "@/lib/i18n";

const Ctx = createContext<Locale>("en");

/** Gives client components the page's language (the dictionary itself is bundled). */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useI18n(): { locale: Locale; m: Messages } {
  const locale = useContext(Ctx);
  return { locale, m: messages(locale) };
}
