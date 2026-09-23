export type Source = "bank" | "paypal" | "apple" | "google" | "email";
export type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";
export type Usage = "yes" | "rarely" | "no";
export type Status = "active" | "idle" | "forgotten" | "cancelled";

/**
 * The single format every parser produces (SPEC.md, "Data inputs").
 * amount > 0 is money out (a charge); amount < 0 is a refund or income.
 */
export interface NormalizedTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  currency: string;
  rawLabel: string; // already masked
  source: Source;
  merchant?: string; // real merchant, when the source reveals it
  plan?: string;
  frequency?: Frequency; // stated by the source (receipt, app store list)
  isTrial?: boolean;
  /** Next charge announced by the source: end of a trial, renewal, price change. */
  nextChargeDate?: string;
  nextChargeAmount?: number;
  /** An email saying the subscription was cancelled (amount 0, evidence only). */
  isCancellation?: boolean;
}

export interface MatchResult {
  bankTransactionId: string;
  intermediaryTransactionId: string;
  confidence: number;
  candidateCount: number;
  merchant: string;
}

export interface DescriptorEntry {
  pattern: string; // case-insensitive substring of the cleaned label or merchant
  serviceName: string;
  category?: string;
  cancellationUrl?: string;
  bundle?: string[]; // services included in a bundle
}

export interface RecurringGroup {
  key: string; // cleaned label or reconciled merchant
  frequency: Frequency;
  transactions: NormalizedTransaction[];
  averageAmount: number;
  currentAmount: number;
  currency: string;
  firstSeen: string;
  lastSeen: string;
  missedPayments: number;
  priceChanges: { date: string; from: number; to: number }[];
  confidence: number;
  merchant?: string;
}

/** How the user pays, which decides how to cancel. */
export type Channel = "apple" | "google" | "paypal" | "direct-debit" | "card";

export interface DetectedSubscription extends RecurringGroup {
  serviceName: string;
  category?: string;
  cancellationUrl?: string;
  bundle?: string[];
  needsLabel: boolean; // unknown label: ask the user once
  yearlyCost: number;
  forgottenReasons: string[];
  includedIn?: string; // another subscription (a bundle) already includes this service
  usage?: Usage;
  status: Status;
  matchedSources: Source[];
  channel: Channel;
  trialCharge?: { date: string; amount: number }; // a small first charge before the full price
  totalPaid: number; // everything paid so far, trial charge included
  nextCharge: string; // expected date of the next charge
  isNew: boolean; // first charged recently
  cancelledOn?: string; // date of a cancellation email
  endsOn?: string; // access ends on (from the cancellation email)
}
