import type { Transaction } from "@/types";

type ExposureState = Pick<Partial<Transaction>, "card_id" | "amount" | "type" | "category">;
const walletTopUp = "เติมเงินวอลเล็ต";

/** Compare complete, validated snapshots; actual debit top-up exemptions stay with card checks. */
export function increasesCardExposure(current: ExposureState | null | undefined, next: ExposureState): boolean {
  if (!next.card_id || next.type !== "expense") return false;
  if (!current) return true;
  return next.card_id !== current.card_id ||
    current.type !== "expense" ||
    (current.category === walletTopUp && next.category !== walletTopUp) ||
    (next.amount !== undefined && current.amount !== undefined && next.amount > current.amount);
}
