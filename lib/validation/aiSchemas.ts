import { z } from "zod";

export const RECEIPT_ANALYSIS_MAX_BYTES = 196_608;
export const receiptAnalysisInputSchema = z.object({
  ocrText: z.string().max(20_000).refine(text => text.trim().length > 0),
  categories: z.array(z.string().max(100)).max(100).default([]),
  cards: z.array(z.object({ id: z.uuid(), name: z.string().max(100), card_type: z.enum(["credit", "debit"]) })).max(50).default([]),
});
const advice = z.array(z.string().max(2_000)).max(20);
export const financialAnalysisOutputSchema = z.object({
  summary: z.string().max(4_000), insights: advice, warnings: advice, tips: advice,
  score: z.number().int().min(0).max(100),
});
export function receiptAnalysisOutputSchema(cards: readonly { id: string }[]) {
  return z.object({
    title: z.string().trim().min(1).max(160), category: z.string().trim().min(1).max(100),
    payment_method: z.enum(["cash", "credit_card", "debit_card"]),
    card_id: z.uuid().nullable().refine(id => id === null || cards.some(card => card.id === id)),
  });
}
