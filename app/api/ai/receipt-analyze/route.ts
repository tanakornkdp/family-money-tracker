import { enforceApiRateLimit } from "@/lib/api/rateLimit";
import { readJsonBounded, PayloadTooLargeError } from "@/lib/api/readJson";
import { receiptAnalysisInputSchema, receiptAnalysisOutputSchema, RECEIPT_ANALYSIS_MAX_BYTES } from "@/lib/validation/aiSchemas";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeFreeAI, FreeAIUnavailableError } from "@/lib/ai/freeRouter";

export const maxDuration = 120;

export async function POST(request: NextRequest) {

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: unknown;
    try { body = await readJsonBounded(request, RECEIPT_ANALYSIS_MAX_BYTES); }
    catch (error) { return NextResponse.json({ error: error instanceof PayloadTooLargeError ? "Request payload is too large" : "Invalid analysis input" }, { status: error instanceof PayloadTooLargeError ? 413 : 400 }); }
    const parsed = receiptAnalysisInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid analysis input" }, { status: 400 });
    const { ocrText, categories, cards } = parsed.data;
    const limited = await enforceApiRateLimit(supabase, "receipt");
    if (limited) return limited;

    const prompt = `You are an expert receipt analysis assistant. Analyze the following OCR raw text from a receipt.
Extract transaction details and match them to the user's available categories and credit/debit cards.

OCR Text:
"""
${ocrText}
"""

User's Categories:
${categories.join(", ")}

User's Credit/Debit Cards:
${cards.map((c: { id: string; name: string; card_type: string }) => `- ID: ${c.id}, Name: ${c.name}, Type: ${c.card_type}`).join("\n")}

Tasks:
1. Extract the merchant/shop name or main item bought to use as the transaction title. Keep it short (e.g., "7-Eleven", "Starbucks", "Lotus's").
2. Predict the most appropriate Category for this purchase. You MUST choose one of the "User's Categories" listed above if provided. If none seem to fit, select the closest one or "อื่นๆ" (or "Other" if categories are in English).
3. Determine the Payment Method. It must be exactly one of: "cash", "credit_card", "debit_card". Look for keywords in the OCR text:
   - "credit card", "visa", "mastercard", "บัตรเครดิต", "รูดบัตร", "เลขบัตร" -> "credit_card"
   - "debit", "บัตรเดบิต", "หักบัญชี" -> "debit_card"
   - Default to "cash" if not sure.
4. If the payment method is "credit_card" or "debit_card", try to match any mentioned card name to one of the "User's Credit/Debit Cards". Return the matched card's ID, or null if no card matches.

Response format:
Return ONLY a raw JSON object with the following fields, without any markdown formatting or extra text:
{
  "title": "extracted merchant or item name",
  "category": "matched category name from user's list",
  "payment_method": "cash" | "credit_card" | "debit_card",
  "card_id": "matched card ID" or null
}

Response:`;

    const response = await completeFreeAI({
      messages: [{ role: "user", content: prompt }],
      json: true,
    });

    const text = response.text ?? "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const analysis = receiptAnalysisOutputSchema(cards).parse(JSON.parse(clean));

    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof FreeAIUnavailableError ? err.message : "AI service unavailable", code: err instanceof FreeAIUnavailableError ? "FREE_AI_UNAVAILABLE" : "AI_ERROR" },
      { status: err instanceof FreeAIUnavailableError ? 503 : 500 }
    );
  }
}
