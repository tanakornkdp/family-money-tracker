import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRateToThb } from "@/services/travelFx";

const CURRENCY_CODE = /^[A-Z]{3}$/;
const DATE_VALUE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currency = request.nextUrl.searchParams.get("currency")?.toUpperCase() ?? "";
  const date = request.nextUrl.searchParams.get("date") ?? "";

  if (!CURRENCY_CODE.test(currency)) {
    return NextResponse.json({ error: "สกุลเงินไม่ถูกต้อง" }, { status: 400 });
  }
  if (date && !DATE_VALUE.test(date)) {
    return NextResponse.json({ error: "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const result = await getExchangeRateToThb(currency, date || undefined);
    return NextResponse.json({ currency, quote: "THB", ...result });
  } catch {
    return NextResponse.json({ error: "เชื่อมต่อบริการอัตราแลกเปลี่ยนไม่ได้ กรุณาลองใหม่หรือใส่อัตราเอง" }, { status: 502 });
  }
}
