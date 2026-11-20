import { apiError } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteTransaction,
  updateTransaction,
} from "@/services/transactions";
import { getCardBalances, getCardsWithBalance } from "@/services/creditCards";
import { cardBalanceErrorResponse } from "@/lib/validation/cardBalanceError";
import { validateTransactionInput } from "@/lib/validation/transactionInput";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json().catch(() => null);
    const validation = validateTransactionInput(body, true);
    if (!validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { data: current, error: currentError } = await supabase
      .from("transactions")
      .select("title, title_id, amount, type, category, date, household_id, payment_method, card_id")
      .eq("id", id)
      .single();
    if (currentError || !current) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const completeValidation = validateTransactionInput(
      { ...current, ...validation.data },
      false,
    );
    if (!completeValidation.data) {
      return NextResponse.json({ error: completeValidation.error }, { status: 400 });
    }

    const next = completeValidation.data;
    if ((next.payment_method === "debit_card" || next.payment_method === "credit_card") && next.card_id) {
      const cards = await getCardsWithBalance(supabase, id);
      const card = cards.find((candidate) => candidate.id === next.card_id);
      if (!card) return NextResponse.json({ error: "บัตรที่เลือกไม่ถูกต้อง" }, { status: 400 });
      if (next.type === "expense" && next.payment_method === "debit_card" && next.category !== "เติมเงินวอลเล็ต" && card.balance < next.amount!) {
        return NextResponse.json({ error: "ยอดเงินในบัตรเดบิตไม่เพียงพอ" }, { status: 400 });
      }
      if (next.type === "expense" && next.payment_method === "credit_card" && card.available < next.amount!) {
        return NextResponse.json({ error: "วงเงินบัตรเครดิตไม่เพียงพอ" }, { status: 400 });
      }
    }

    const transaction = await updateTransaction(supabase, id, validation.data);
    return NextResponse.json({ transaction });
  } catch (err) {
    const cardError = cardBalanceErrorResponse(err, "PATCH");
    if (cardError) return NextResponse.json({ error: cardError.error }, { status: cardError.status });
    return apiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ดึงรายการที่จะลบ
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    // ถ้าเป็นรายการเติมเงินวอลเล็ต ตรวจสอบว่าลบแล้วยอดจะติดลบไหม
    if (tx?.category === "เติมเงินวอลเล็ต" && tx?.card_id) {
      const balances = await getCardBalances(supabase, [{ id: tx.card_id }], id);
      const balanceAfterDelete = balances[tx.card_id];

      if (balanceAfterDelete < 0) {
        return NextResponse.json(
          { error: `ไม่สามารถลบได้ เพราะยอดวอลเล็ตจะติดลบ (คงเหลือหลังลบ: ${balanceAfterDelete.toLocaleString()} บาท)` },
          { status: 400 }
        );
      }
    }

    await deleteTransaction(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
