export interface TravelExchangeRate {
  rate: number;
  date: string;
}

export async function getExchangeRateToThb(
  currency: string,
  date?: string,
): Promise<TravelExchangeRate> {
  return getExchangeRate(currency, "THB", date);
}

export async function getExchangeRate(
  currency: string,
  quote: string,
  date?: string,
): Promise<TravelExchangeRate> {
  if (currency === quote) return { rate: 1, date: date ?? new Date().toISOString().slice(0, 10) };
  if (!/^[A-Z]{3}$/.test(currency) || !/^[A-Z]{3}$/.test(quote) || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    throw new Error("สกุลเงินหรือวันที่ไม่ถูกต้อง");
  }

  const endpoint = new URL(`https://api.frankfurter.dev/v2/rate/${currency.toLowerCase()}/${quote.toLowerCase()}`);
  if (date) endpoint.searchParams.set("date", date);
  const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error("ไม่สามารถดึงอัตราแลกเปลี่ยนอ้างอิงได้");

  const data = (await response.json()) as { date?: string; rate?: number };
  if (!Number.isFinite(data.rate) || !data.rate || data.rate <= 0 || !data.date) {
    throw new Error("ไม่พบอัตราแลกเปลี่ยนของสกุลเงินนี้");
  }
  return { rate: data.rate, date: data.date };
}
