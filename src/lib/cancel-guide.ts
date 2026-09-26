import type { Channel } from "./types";
import { messages, type Locale } from "./i18n";

/**
 * How to cancel depends first on how the user pays: a subscription bought through Apple or
 * Google can only be cancelled there, whatever the service's own website says.
 */
export function cancellationSteps(channel: Channel, serviceName: string, locale: Locale = "en"): string[] {
  const c = messages(locale).cancel;
  switch (channel) {
    case "apple":
      return c.apple(serviceName);
    case "google":
      return c.google(serviceName);
    case "paypal":
      return c.paypal(serviceName);
    case "direct-debit":
      return c.directDebit(serviceName);
    default:
      return c.card(serviceName);
  }
}
