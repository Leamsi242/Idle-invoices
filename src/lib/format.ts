// Kept for existing callers; new code uses money() and messages().per from ./i18n.
export { money } from "./i18n";

export const FREQUENCY_LABEL = { weekly: "per week", monthly: "per month", quarterly: "per quarter", yearly: "per year" } as const;
