import type { Channel } from "./types";

/**
 * How to cancel depends first on how the user pays: a subscription bought through Apple or
 * Google can only be cancelled there, whatever the service's own website says.
 */
export function cancellationSteps(channel: Channel, serviceName: string): string[] {
  switch (channel) {
    case "apple":
      return [
        `${serviceName} is billed by Apple, so cancel it on your iPhone or iPad.`,
        "Open Settings, tap your name, then Subscriptions.",
        `Tap ${serviceName}, then Cancel Subscription. You keep access until the end of the paid period.`,
      ];
    case "google":
      return [
        `${serviceName} is billed by Google Play, so cancel it in the Play Store.`,
        "Open the Play Store app, tap your profile picture, then Payments & subscriptions, then Subscriptions.",
        `Tap ${serviceName}, then Cancel subscription.`,
      ];
    case "paypal":
      return [
        `Cancel in your ${serviceName} account first (link below).`,
        "Then stop the payment in PayPal: Settings, Payments, Manage automatic payments.",
        `Choose ${serviceName} and cancel it, so no further payment can be taken.`,
      ];
    case "direct-debit":
      return [
        `Cancel with ${serviceName} (link below). Check the notice period in your contract.`,
        "Keep the confirmation email or letter.",
        "If charges continue after the end date, you can revoke the SEPA mandate in your banking app and dispute unauthorised debits.",
      ];
    default:
      return [
        `Cancel from your account on the ${serviceName} website or app (link below).`,
        "Removing your card is not enough: the contract stays active and the service may retry the payment.",
        "Keep the cancellation confirmation until the next billing date has passed.",
      ];
  }
}
