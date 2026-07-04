import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
  }
  const groq = new Groq({ apiKey });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ocrText, categories = [], cards = [] } = body;

    if (!ocrText) {
      return NextResponse.json({ error: "ocrText is required" }, { status: 400 });
    }

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

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.1, // low temperature for precise extraction
    });

    const text = response.choices[0].message.content ?? "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(clean);

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Receipt analyze AI route error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
