import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteTransaction,
  updateTransaction,
} from "@/services/transactions";

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
    const body = await request.json();
    const transaction = await updateTransaction(supabase, id, body);
    return NextResponse.json({ transaction });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
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
      const { data: cardTxs } = await supabase
        .from("transactions")
        .select("amount, category")
        .eq("card_id", tx.card_id);

      if (cardTxs) {
        const currentBalance = cardTxs.reduce((sum, t) => {
          if (t.category === "เติมเงินวอลเล็ต") return sum + Number(t.amount);
          return sum - Number(t.amount);
        }, 0);

        const balanceAfterDelete = currentBalance - Number(tx.amount);

        if (balanceAfterDelete < 0) {
          return NextResponse.json(
            { error: `ไม่สามารถลบได้ เพราะยอดวอลเล็ตจะติดลบ (คงเหลือหลังลบ: ${balanceAfterDelete.toLocaleString()} บาท)` },
            { status: 400 }
          );
        }
      }
    }

    await deleteTransaction(supabase, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}