const hour = 3600;
export const RATE_LIMITS = {
  chat: { key: "ai-chat", limit: 30, windowSeconds: hour },
  analyze: { key: "ai-analyze", limit: 20, windowSeconds: hour },
  receipt: { key: "ai-receipt-analyze", limit: 40, windowSeconds: hour },
  ocr: { key: "ocr", limit: 20, windowSeconds: hour },
} as const;

export function parseRateLimitDecision(data: unknown): { allowed: boolean; retryAfter: number } {
  const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
  if (!row || typeof row.allowed !== "boolean" || !Number.isSafeInteger(row.retry_after_seconds) || row.retry_after_seconds < 0 || (!row.allowed && row.retry_after_seconds < 1)) throw new Error("Invalid rate limit result");
  return { allowed: row.allowed, retryAfter: row.retry_after_seconds };
}
