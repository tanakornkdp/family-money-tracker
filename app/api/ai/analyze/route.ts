import { enforceApiRateLimit } from "@/lib/api/rateLimit";
import { financialAnalysisOutputSchema } from "@/lib/validation/aiSchemas";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeFreeAI, FreeAIUnavailableError } from "@/lib/ai/freeRouter";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ error: "Request payload is too large" }, { status: 413 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid analysis input" }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const kpisValue = input.kpis;
    const categoriesValue = input.topCategories;
    const periodValue = input.period;
    const isValidKpis = Boolean(
      kpisValue &&
      typeof kpisValue === "object" &&
      !Array.isArray(kpisValue) &&
      ["totalIncome", "totalExpense", "balance", "transactionCount"].every((key) =>
        typeof (kpisValue as Record<string, unknown>)[key] === "number" &&
        Number.isFinite((kpisValue as Record<string, number>)[key])
      ) &&
      (kpisValue as Record<string, number>).totalIncome >= 0 &&
      (kpisValue as Record<string, number>).totalExpense >= 0 &&
      Number.isInteger((kpisValue as Record<string, number>).transactionCount) &&
      (kpisValue as Record<string, number>).transactionCount >= 0
    );
    const isValidCategories =
      Array.isArray(categoriesValue) &&
      categoriesValue.length <= 10 &&
      categoriesValue.every((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return false;
        const category = item as Record<string, unknown>;
        return (
          typeof category.category === "string" &&
          category.category.trim().length > 0 &&
          category.category.length <= 100 &&
          typeof category.amount === "number" &&
          Number.isFinite(category.amount) &&
          category.amount >= 0 &&
          typeof category.percentage === "number" &&
          Number.isFinite(category.percentage) &&
          category.percentage >= 0 &&
          category.percentage <= 100
        );
      });

    if (
      !isValidKpis ||
      !isValidCategories ||
      typeof periodValue !== "string" ||
      periodValue.length === 0 ||
      periodValue.length > 100
    ) {
      return NextResponse.json({ error: "Invalid analysis input" }, { status: 400 });
    }

    const kpis = kpisValue as {
      totalIncome: number;
      totalExpense: number;
      balance: number;
      transactionCount: number;
    };
    const topCategories = categoriesValue as {
      category: string;
      amount: number;
      percentage: number;
    }[];
    const period = periodValue;
    const limited = await enforceApiRateLimit(supabase, "analyze");
    if (limited) return limited;
    const prompt = `คุณเป็นผู้เชี่ยวชาญด้านการเงินส่วนตัว วิเคราะห์ข้อมูลการเงินต่อไปนี้และให้คำแนะนำเป็นภาษาไทย:

ข้อมูลช่วง ${period}:
- รายรับรวม: ${kpis.totalIncome} บาท
- รายจ่ายรวม: ${kpis.totalExpense} บาท
- ยอดคงเหลือสุทธิ: ${kpis.balance} บาท
- จำนวนรายการ: ${kpis.transactionCount} รายการ

หมวดหมู่ค่าใช้จ่ายสูงสุด 5 อันดับ:
${topCategories.map((c: { category: string; amount: number; percentage: number }, i: number) => `${i + 1}. ${c.category}: ${c.amount.toLocaleString()} บาท (${c.percentage.toFixed(1)}%)`).join("\n")}

กรุณาตอบในรูปแบบ JSON ดังนี้:
{
  "summary": "สรุปภาพรวมการเงิน 1-2 ประโยค",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "warnings": ["คำเตือน ถ้ามี"],
  "tips": ["เคล็ดลับออม/ประหยัด 1", "เคล็ดลับ 2", "เคล็ดลับ 3"],
  "score": 75
}

โดย score คือคะแนนสุขภาพทางการเงิน 0-100 (100 = ดีมาก)
ตอบเป็น JSON เท่านั้น ไม่ต้องมีคำอธิบายอื่น`;

    const response = await completeFreeAI({
      messages: [{ role: "user", content: prompt }],
      json: true,
    });

    const text = response.text ?? "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const analysis = financialAnalysisOutputSchema.parse(JSON.parse(clean));

    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof FreeAIUnavailableError ? err.message : "AI service unavailable", code: err instanceof FreeAIUnavailableError ? "FREE_AI_UNAVAILABLE" : "AI_ERROR" },
      { status: err instanceof FreeAIUnavailableError ? 503 : 500 }
    );
  }
}
