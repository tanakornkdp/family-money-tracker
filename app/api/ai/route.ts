import { toDateInputValue } from "@/lib/utils/dateHelpers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeFreeAI, FreeAIUnavailableError } from "@/lib/ai/freeRouter";

export const maxDuration = 120;
import { getTransactions, calculateKpis, calculateCategoryBreakdown } from "@/services/transactions";

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 48_000) {
    return NextResponse.json({ error: "Request payload is too large" }, { status: 413 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { messages, locale } = body;

    if (
      !Array.isArray(messages) ||
      messages.length > 20 ||
      messages.some((message) =>
        !message ||
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        message.content.trim().length === 0 ||
        message.content.length > 2_000
      )
    ) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const today = new Date();
    const monthStart = toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
    const todayStr = toDateInputValue(today);

    const transactions = await getTransactions(supabase, {
      dateFrom: monthStart,
      dateTo: todayStr,
    });

    const kpis = calculateKpis(transactions);
    const categoryBreakdown = calculateCategoryBreakdown(transactions);

    const systemPrompt = locale === "en"
      ? `You are a smart and friendly personal finance assistant. Always respond in English.

This month's financial data (${monthStart} to ${todayStr}):
- Income: ${kpis.totalIncome.toLocaleString()} THB
- Expenses: ${kpis.totalExpense.toLocaleString()} THB
- Balance: ${kpis.balance.toLocaleString()} THB
- Transactions: ${kpis.transactionCount}

Expenses by category this month:
${categoryBreakdown.slice(0, 8).map((c) => `- ${c.category}: ${c.amount.toLocaleString()} THB (${c.percentage.toFixed(1)}%)`).join("\n")}

Guidelines:
- Reply concisely, clearly, and in a friendly tone
- Use real numbers from the data above when answering finance questions
- Give practical advice
- If asked about non-financial topics, politely decline`

      : `คุณเป็นผู้ช่วยด้านการเงินส่วนตัวที่ฉลาดและเป็นมิตร ตอบเป็นภาษาไทยเสมอ

ข้อมูลการเงินของ user เดือนนี้ (${monthStart} ถึง ${todayStr}):
- รายรับ: ${kpis.totalIncome.toLocaleString()} บาท
- รายจ่าย: ${kpis.totalExpense.toLocaleString()} บาท
- ยอดคงเหลือ: ${kpis.balance.toLocaleString()} บาท
- จำนวนรายการ: ${kpis.transactionCount} รายการ

ค่าใช้จ่ายตามหมวดหมู่เดือนนี้:
${categoryBreakdown.slice(0, 8).map((c) => `- ${c.category}: ${c.amount.toLocaleString()} บาท (${c.percentage.toFixed(1)}%)`).join("\n")}

คำแนะนำการตอบ:
- ตอบกระชับ ชัดเจน เป็นมิตร
- ใช้ตัวเลขจริงจากข้อมูลด้านบนเมื่อตอบคำถามเกี่ยวกับการเงิน
- ให้คำแนะนำที่ปฏิบัติได้จริง
- ถ้าถามเรื่องที่ไม่เกี่ยวกับการเงิน ให้บอกว่าช่วยเฉพาะด้านการเงิน`;

    const response = await completeFreeAI({
      messages: [
        { role: "system", content: systemPrompt },
      ...messages.map((message: { role: "user" | "assistant"; content: string }) => ({
        role: message.role,
        content: message.content.trim(),
      })),
      ],
    });

    const reply = response.text ?? "ขออภัย ไม่สามารถตอบได้ในขณะนี้";
    return NextResponse.json({ message: reply, provider: response.provider, model: response.model });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof FreeAIUnavailableError ? err.message : "AI service unavailable", code: err instanceof FreeAIUnavailableError ? "FREE_AI_UNAVAILABLE" : "AI_ERROR" },
      { status: err instanceof FreeAIUnavailableError ? 503 : 500 }
    );
  }
}
