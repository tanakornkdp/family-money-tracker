const currencyLocaleMap: Record<string, string> = {
  USD: "en-US",
  THB: "th-TH",
  EUR: "de-DE",
  JPY: "ja-JP",
  GBP: "en-GB",
  SGD: "en-SG",
};

export function createCurrencyFormatter(currency: string = "THB") {
  const locale = currencyLocaleMap[currency] ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
}

export function formatCurrency(value: number, currency: string = "THB"): string {
  return createCurrencyFormatter(currency).format(value);
}

export const SUPPORTED_CURRENCIES = ["THB", "USD", "EUR", "JPY", "GBP", "SGD"] as const;
