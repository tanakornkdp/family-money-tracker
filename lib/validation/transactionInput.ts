import type { PaymentMethod, TransactionType } from "@/types";

export interface ValidatedTransactionInput {
  title?: string;
  title_id?: string | null;
  amount?: number;
  type?: TransactionType;
  category?: string;
  date?: string;
  household_id?: string | null;
  payment_method?: PaymentMethod;
  card_id?: string | null;
  travel_trip_id?: string | null;
  travel_original_amount?: number;
  travel_original_currency?: string;
  travel_exchange_rate_to_thb?: number;
  travel_exchange_rate_date?: string;
}

const fields = new Set([
  "title",
  "title_id",
  "amount",
  "type",
  "category",
  "date",
  "household_id",
  "payment_method",
  "card_id",
  "travel_trip_id",
  "travel_original_amount",
  "travel_original_currency",
  "travel_exchange_rate_to_thb",
  "travel_exchange_rate_date",
]);

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateTransactionInput(
  value: unknown,
  partial = false,
  existing: ValidatedTransactionInput = {},
): { data?: ValidatedTransactionInput; error?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Transaction data must be an object" };
  }

  const source = value as Record<string, unknown>;
  if (Object.keys(source).some((key) => !fields.has(key))) {
    return { error: "Transaction data contains unsupported fields" };
  }

  const data: ValidatedTransactionInput = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(source, key);

  if (has("title")) {
    if (typeof source.title !== "string" || !source.title.trim() || source.title.length > 160) {
      return { error: "Title must be between 1 and 160 characters" };
    }
    data.title = source.title.trim();
  } else if (!partial) return { error: "Title is required" };

  if (has("amount")) {
    const amount = typeof source.amount === "number" ? source.amount : Number(source.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
      return { error: "Amount must be greater than 0 and no more than 100,000,000" };
    }
    data.amount = amount;
  } else if (!partial) return { error: "Amount is required" };

  if (has("type")) {
    if (source.type !== "income" && source.type !== "expense") {
      return { error: "Type must be income or expense" };
    }
    data.type = source.type as TransactionType;
  } else if (!partial) return { error: "Type is required" };

  if (has("category")) {
    if (typeof source.category !== "string" || !source.category.trim() || source.category.length > 100) {
      return { error: "Category must be between 1 and 100 characters" };
    }
    data.category = source.category.trim();
  } else if (!partial) return { error: "Category is required" };

  if (has("date")) {
    if (typeof source.date !== "string" || !isValidDate(source.date)) {
      return { error: "Date must be a valid YYYY-MM-DD date" };
    }
    data.date = source.date;
  } else if (!partial) return { error: "Date is required" };

  for (const key of ["title_id", "household_id", "card_id", "travel_trip_id"] as const) {
    if (!has(key)) continue;
    const fieldValue = source[key];
    if (fieldValue !== null && (typeof fieldValue !== "string" || !fieldValue.trim())) {
      return { error: `${key} must be a non-empty string or null` };
    }
    data[key] = fieldValue as string | null;
  }

  if (has("travel_original_amount")) {
    const amount = Number(source.travel_original_amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
      return { error: "ยอดเงินสกุลท้องถิ่นไม่ถูกต้อง" };
    }
    data.travel_original_amount = amount;
  }
  if (has("travel_original_currency")) {
    if (typeof source.travel_original_currency !== "string" || !/^[A-Z]{3}$/.test(source.travel_original_currency)) {
      return { error: "สกุลเงินท้องถิ่นไม่ถูกต้อง" };
    }
    data.travel_original_currency = source.travel_original_currency;
  }
  if (has("travel_exchange_rate_to_thb")) {
    const rate = Number(source.travel_exchange_rate_to_thb);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 1_000_000) {
      return { error: "อัตราแลกเปลี่ยนไม่ถูกต้อง" };
    }
    data.travel_exchange_rate_to_thb = rate;
  }
  if (has("travel_exchange_rate_date")) {
    if (typeof source.travel_exchange_rate_date !== "string" || !isValidDate(source.travel_exchange_rate_date)) {
      return { error: "วันที่อัตราแลกเปลี่ยนไม่ถูกต้อง" };
    }
    data.travel_exchange_rate_date = source.travel_exchange_rate_date;
  }

  if (has("payment_method")) {
    if (!(["cash", "debit_card", "credit_card", "bank_transfer"] as const).includes(source.payment_method as PaymentMethod)) {
      return { error: "Payment method is invalid" };
    }
    data.payment_method = source.payment_method as PaymentMethod;
  }

  const effectivePaymentMethod = data.payment_method ?? existing.payment_method ?? "cash";
  const effectiveCardId = has("card_id") ? data.card_id : existing.card_id;
  if ((effectivePaymentMethod === "credit_card" || effectivePaymentMethod === "debit_card") && !effectiveCardId) {
    return { error: "Choose a card for card payments" };
  }
  if ((effectivePaymentMethod === "cash" || effectivePaymentMethod === "bank_transfer") && effectiveCardId) {
    return { error: "Cash and bank transfers cannot be linked to a card" };
  }
  if (partial && Object.keys(data).length === 0) {
    return { error: "At least one transaction field is required" };
  }

  return { data };
}
