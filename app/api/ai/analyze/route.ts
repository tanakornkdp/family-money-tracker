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
    const { kpis, categoryBreakdown, topCategories, period } = body;

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

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });

    const text = response.choices[0].message.content ?? "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(clean);

    return NextResponse.json(analysis);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}