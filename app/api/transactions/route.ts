import { apiError } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createTransaction,
  getTransactions,
} from "@/services/transactions";
import { getCardsWithBalance } from "@/services/creditCards";
import type { TransactionInput } from "@/services/transactions";
import { validateTransactionInput } from "@/lib/validation/transactionInput";
import { getActiveTravelTrips } from "@/services/travelTrips";
import { getExchangeRate, getExchangeRateToThb } from "@/services/travelFx";
import type { TravelTrip } from "@/types";
import { getUserSettings } from "@/services/userSettings";
import { cardBalanceErrorResponse } from "@/lib/validation/cardBalanceError";

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
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json().catch(() => null);
    const validation = validateTransactionInput(body);
    if (!validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const {
      travel_trip_id: requestedTripId,
      travel_original_amount: originalAmount,
      travel_original_currency: originalCurrency,
      travel_exchange_rate_to_thb: suppliedRate,
      travel_exchange_rate_date: suppliedRateDate,
      ...validatedInput
    } = validation.data;
    const input = validatedInput as Required<Pick<TransactionInput, "title" | "amount" | "type" | "category" | "date">> & TransactionInput;

    let activeTrips: TravelTrip[] = [];
    if (request.nextUrl.searchParams.get("source") !== "import") {
      try {
        activeTrips = await getActiveTravelTrips(supabase, userData.user.id);
      } catch (error) {
        const message = (error as Error).message;
        // Keep existing transaction entry available until the travel schema migration is applied.
        if (!/travel_trips|schema cache|42P01|PGRST205/i.test(message)) throw error;
      }
    }
    if (activeTrips.length > 1 && !requestedTripId) {
      return NextResponse.json({ error: "มีหลายทริปที่เปิดอยู่ กรุณาเลือกทริปก่อนบันทึก" }, { status: 409 });
    }
    const activeTrip = requestedTripId
      ? activeTrips.find((trip) => trip.id === requestedTripId)
      : activeTrips[0];
    if (requestedTripId && !activeTrip) {
      return NextResponse.json({ error: "ทริปที่เลือกยังไม่ได้เปิดใช้งาน" }, { status: 409 });
    }
    const hasTravelAmount = originalAmount !== undefined;
    const hasTravelCurrency = originalCurrency !== undefined;
    if (hasTravelAmount !== hasTravelCurrency || (hasTravelAmount && !activeTrip)) {
      return NextResponse.json({ error: "ข้อมูลสกุลเงินของทริปไม่ครบถ้วน" }, { status: 400 });
    }
    if (activeTrip) {
      try {
        const settings = await getUserSettings(supabase, userData.user.id);
        const accountCurrency = settings?.currency ?? "THB";
        const fxToTripCurrency = suppliedRate
          ? { rate: suppliedRate, date: suppliedRateDate ?? input.date }
          : await getExchangeRateToThb(activeTrip.currency, input.date);
        const localAmount = hasTravelAmount ? Number(originalAmount) : Number(input.amount);
        const amountThb = hasTravelAmount
          ? localAmount * fxToTripCurrency.rate
          : Number(input.amount) * (await getExchangeRateToThb(accountCurrency, input.date)).rate;
        const accountRate = hasTravelAmount
          ? (await getExchangeRate(activeTrip.currency, accountCurrency, input.date)).rate
          : 1;
        const transactionAmount = hasTravelAmount ? localAmount * accountRate : Number(input.amount);
        if (!Number.isFinite(amountThb) || amountThb <= 0 || amountThb > 100_000_000 || !Number.isFinite(transactionAmount) || transactionAmount <= 0 || transactionAmount > 100_000_000) {
          return NextResponse.json({ error: "ยอดเงินบาทหลังแปลงเกินขอบเขตที่ระบบรองรับ" }, { status: 400 });
        }
        if (hasTravelAmount && originalCurrency !== activeTrip.currency) {
          return NextResponse.json({ error: "สกุลเงินไม่ตรงกับทริปที่เลือก" }, { status: 400 });
        }
        input.amount = transactionAmount;
        input.travel_trip_id = activeTrip.id;
        input.travel_amount_thb = amountThb;
        input.travel_original_amount = hasTravelAmount ? localAmount : amountThb / fxToTripCurrency.rate;
        input.travel_original_currency = activeTrip.currency;
        input.travel_exchange_rate_to_thb = fxToTripCurrency.rate;
        input.travel_exchange_rate_date = fxToTripCurrency.date;
      } catch (error) {
        const knownMessages = ["สกุลเงินหรือวันที่ไม่ถูกต้อง", "ไม่สามารถดึงอัตราแลกเปลี่ยนอ้างอิงได้", "ไม่พบอัตราแลกเปลี่ยนของสกุลเงินนี้"];
        const message = error instanceof Error && knownMessages.includes(error.message) ? error.message : "ไม่สามารถแปลงสกุลเงินของทริปได้";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    } else if (hasTravelAmount || hasTravelCurrency || suppliedRate || suppliedRateDate) {
      return NextResponse.json({ error: "ไม่มีทริปที่กำลังเปิดใช้งาน" }, { status: 409 });
    }
    const paymentMethod = input.payment_method ?? "cash";

    // ตรวจสอบยอดเงินในบัตรเดบิตก่อนตัดเงิน (ไม่รวมตอนเติมเงิน)
    if ((paymentMethod === "debit_card" || paymentMethod === "credit_card") && input.card_id) {
      const cards = await getCardsWithBalance(supabase);
      const card = cards.find((c) => c.id === input.card_id);

      if (!card) {
        return NextResponse.json({ error: "บัตรที่เลือกไม่ถูกต้อง" }, { status: 400 });
      }
      if (paymentMethod === "credit_card" && card.card_type !== "credit") {
        return NextResponse.json({ error: "เลือกบัตรเครดิตสำหรับรายการนี้" }, { status: 400 });
      }
      if (paymentMethod === "debit_card" && card.card_type !== "debit") {
        return NextResponse.json({ error: "เลือกบัตรเดบิตสำหรับรายการนี้" }, { status: 400 });
      }
      if (paymentMethod === "debit_card" && input.category !== "เติมเงินวอลเล็ต" && input.type === "expense" && card.balance < input.amount) {
        return NextResponse.json(
          { error: `ยอดเงินในบัตรไม่เพียงพอ (คงเหลือ ${card.balance.toLocaleString()} บาท)` },
          { status: 400 }
        );
      }
      if (paymentMethod === "credit_card" && input.type === "expense" && card.available < input.amount) {
        return NextResponse.json(
          { error: `วงเงินบัตรไม่เพียงพอ (คงเหลือ ${card.available.toLocaleString()} บาท)` },
          { status: 400 }
        );
      }
    }

    const transaction = await createTransaction(supabase, userData.user.id, input);

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err) {
    const cardError = cardBalanceErrorResponse(err, "POST");
    if (cardError) return NextResponse.json({ error: cardError.error }, { status: cardError.status });
    return apiError(err);
  }
}
