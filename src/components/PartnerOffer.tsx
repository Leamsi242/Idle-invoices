import type { Alternative } from "@/lib/partner-offers";
import { OFFER_DICTS } from "@/lib/i18n-offers";
import { formatDate, money, type Locale } from "@/lib/i18n";
import { Icon } from "./ui";

/** A cheaper partner offer for this subscription, always labelled as such. */
export function PartnerOfferCard({ alt, current, locale }: { alt: Alternative; current: number; locale: Locale }) {
  const t = OFFER_DICTS[locale];
  const $ = (n: number) => money(n, alt.offer.currency, locale);
  return (
    <section className="space-y-2 rounded-3xl border border-save/40 bg-save-soft p-4 text-sm" aria-label={t.eyebrow}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-save">{alt.priceRose ? t.roseTitle : t.eyebrow}</p>
      <p className="font-semibold text-ink">{alt.offer.title[locale]} · {alt.offer.partner}</p>
      <p className="text-ink-2">{t.saving($(alt.offer.monthlyPrice), $(current), $(alt.savingYearly))}</p>
      <p className="text-xs text-muted">{alt.offer.conditions[locale]} {t.check}</p>
      <a href={alt.offer.url} target="_blank" rel="sponsored noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand">
        {t.open(alt.offer.partner)} <Icon name="arrow" className="h-4 w-4 -rotate-45" />
      </a>
      <p className="border-t border-line/60 pt-2 text-[11px] leading-snug text-muted">{t.disclosure} {t.checked(formatDate(alt.offer.checkedOn, locale))}</p>
    </section>
  );
}
