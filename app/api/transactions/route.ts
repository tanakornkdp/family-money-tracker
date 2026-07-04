import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createTransaction,
  getTransactions,
} from "@/services/transactions";
import { getCardsWithBalance } from "@/services/creditCards";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const householdId = request.nextUrl.searchParams.get("household_id");
    const transactions = await getTransactions(supabase, {
      householdId: householdId || undefined,
    });
    return NextResponse.json({ transactions });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, title_id, amount, type, category, date, household_id, payment_method, card_id } = body;

    if (!title || !amount || !type || !category || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ตรวจสอบยอดเงินในบัตรเดบิตก่อนตัดเงิน (ไม่รวมตอนเติมเงิน)
    if (payment_method === "debit_card" && card_id && category !== "เติมเงินวอลเล็ต" && type === "expense") {
      const cards = await getCardsWithBalance(supabase);
      const card = cards.find((c) => c.id === card_id);

      if (card && card.balance < amount) {
        return NextResponse.json(
          { error: `ยอดเงินในบัตรไม่เพียงพอ (คงเหลือ ${card.balance.toLocaleString()} บาท)` },
          { status: 400 }
        );
      }
    }

    const transaction = await createTransaction(supabase, userData.user.id, {
      title,
      title_id: title_id ?? null,
      amount,
      type,
      category,
      date,
      household_id: household_id ?? null,
      payment_method: payment_method ?? "cash",
      card_id: card_id ?? null,
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}