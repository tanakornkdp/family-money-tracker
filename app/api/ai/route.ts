import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";
import { getTransactions, calculateKpis, calculateCategoryBreakdown } from "@/services/transactions";

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
    const { messages, locale } = body;

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

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

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const reply = response.choices[0].message.content ?? "ขออภัย ไม่สามารถตอบได้ในขณะนี้";
    return NextResponse.json({ message: reply });
  } catch (err) {
    console.error("AI route error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}