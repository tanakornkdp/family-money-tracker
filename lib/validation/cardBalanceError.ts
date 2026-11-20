type CardError = { code?: unknown; message?: unknown; details?: unknown; cause?: unknown };

/** Only translate our trigger's known codes/prefixes, never arbitrary SQL text. */
export function cardBalanceErrorResponse(error: unknown, method: "POST" | "PATCH"): { error: string; status: 400 } | null {
  let candidate = error;
  for (let depth = 0; depth < 3 && candidate && typeof candidate === "object"; depth++) {
    const value = candidate as CardError;
    const debit = value.code === "P1001" && value.message === "CARD_DEBIT_INSUFFICIENT";
    const credit = value.code === "P1002" && value.message === "CARD_CREDIT_INSUFFICIENT";
    if (value.code === "P1003" && value.message === "CARD_NOT_AVAILABLE") return { error: "บัตรที่เลือกไม่ถูกต้อง", status: 400 };
    if (debit || credit) {
      if (method === "PATCH") return { error: debit ? "ยอดเงินในบัตรเดบิตไม่เพียงพอ" : "วงเงินบัตรเครดิตไม่เพียงพอ", status: 400 };
      let available: unknown;
      try { available = typeof value.details === "string" ? JSON.parse(value.details)?.available : undefined; } catch { /* Untrusted internal details must never reach the response. */ }
      if (typeof available !== "number" || !Number.isFinite(available)) return { error: debit ? "ยอดเงินในบัตรเดบิตไม่เพียงพอ" : "วงเงินบัตรเครดิตไม่เพียงพอ", status: 400 };
      return { error: debit ? `ยอดเงินในบัตรไม่เพียงพอ (คงเหลือ ${available.toLocaleString()} บาท)` : `วงเงินบัตรไม่เพียงพอ (คงเหลือ ${available.toLocaleString()} บาท)`, status: 400 };
    }
    candidate = value.cause;
  }
  return null;
}
