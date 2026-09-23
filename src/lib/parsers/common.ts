import { randomUUID } from "node:crypto";
import type { NormalizedTransaction } from "../types";
import { maskSensitive } from "../mask";
import { round2 } from "../amount";

/** Builds a transaction and masks its text fields. Every parser goes through here. */
export function makeTx(tx: Omit<NormalizedTransaction, "id">): NormalizedTransaction {
  return {
    ...tx,
    id: randomUUID(),
    amount: round2(tx.amount),
    rawLabel: maskSensitive(tx.rawLabel.replace(/\s+/g, " ").trim()),
    merchant: tx.merchant ? maskSensitive(tx.merchant.trim()) : undefined,
    plan: tx.plan ? maskSensitive(tx.plan.trim()) : undefined,
  };
}
