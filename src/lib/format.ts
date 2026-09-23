export const money = (amount: number, currency = "EUR") =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(amount);

export const FREQUENCY_LABEL = { weekly: "per week", monthly: "per month", quarterly: "per quarter", yearly: "per year" } as const;
