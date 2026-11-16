import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRateToThb } from "@/services/travelFx";
import { getUserSettings } from "@/services/userSettings";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { transaction_ids?: unknown } | null;
  const ids = body?.transaction_ids;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || ids.some((value) => typeof value !== "string")) {
    return NextResponse.json({ error: "เลือกรายการ 1–100 รายการเพื่อเพิ่มเข้าทริป" }, { status: 400 });
  }

  const [{ data: trip, error: tripError }, { data: transactions, error: txError }, settings] = await Promise.all([
    supabase.from("travel_trips").select("id,currency,user_id").eq("id", tripId).eq("user_id", auth.user.id).maybeSingle(),
    supabase.from("transactions").select("id,amount,date,type,travel_trip_id").eq("user_id", auth.user.id).in("id", ids),
    getUserSettings(supabase, auth.user.id),
  ]);
  if (tripError || txError) {
    return NextResponse.json({ error: tripError?.message ?? txError?.message }, { status: 500 });
  }
  if (!trip) return NextResponse.json({ error: "ไม่พบทริปนี้" }, { status: 404 });
  if (!transactions || transactions.length !== ids.length) {
    return NextResponse.json({ error: "มีบางรายการที่ไม่พบหรือไม่มีสิทธิ์ใช้งาน" }, { status: 404 });
  }
  if (transactions.some((tx) => tx.type !== "expense" || tx.travel_trip_id)) {
    return NextResponse.json({ error: "เลือกได้เฉพาะรายจ่ายที่ยังไม่ได้ผูกกับทริปอื่น" }, { status: 409 });
  }

  try {
    const ratesByDate = new Map<string, { tripRate: number; accountRate: number; date: string }>();
    const dates = [...new Set(transactions.map((tx) => tx.date))];
    const accountCurrency = settings?.currency ?? "THB";
    await Promise.all(dates.map(async (date) => {
      const [tripRate, accountRate] = await Promise.all([
        getExchangeRateToThb(trip.currency, date),
        getExchangeRateToThb(accountCurrency, date),
      ]);
      ratesByDate.set(date, { tripRate: tripRate.rate, accountRate: accountRate.rate, date: tripRate.date });
    }));

    const updated = [];
    for (const tx of transactions) {
      const fx = ratesByDate.get(tx.date)!;
      const { data, error } = await supabase.from("transactions").update({
        travel_trip_id: tripId,
        travel_amount_thb: Number(tx.amount) * fx.accountRate,
        travel_original_amount: (Number(tx.amount) * fx.accountRate) / fx.tripRate,
        travel_original_currency: trip.currency,
        travel_exchange_rate_to_thb: fx.tripRate,
        travel_exchange_rate_date: fx.date,
      }).eq("id", tx.id).eq("user_id", auth.user.id).is("travel_trip_id", null).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("รายการบางรายการถูกแก้ไขระหว่างดำเนินการ กรุณาโหลดหน้าใหม่");
      updated.push({
        id: data.id,
        travel_amount_thb: Number(tx.amount) * fx.accountRate,
        travel_original_amount: (Number(tx.amount) * fx.accountRate) / fx.tripRate,
        travel_original_currency: trip.currency,
        travel_exchange_rate_to_thb: fx.tripRate,
        travel_exchange_rate_date: fx.date,
      });
    }
    return NextResponse.json({ linked: updated.length, transactions: updated });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "เชื่อมต่ออัตราแลกเปลี่ยนไม่ได้" }, { status: 502 });
  }
}
