import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTravelTrips } from "@/services/travelTrips";
import type { TravelActivationMode } from "@/types";

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ trips: await getTravelTrips(supabase, auth.user.id) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120 ||
      typeof body.destination !== "string" || !body.destination.trim() || body.destination.trim().length > 120 ||
      typeof body.currency !== "string" || !/^[A-Z]{3}$/.test(body.currency) ||
      !isDate(body.start_date) || !isDate(body.end_date) || body.end_date < body.start_date ||
      (body.activation_mode !== "manual" && body.activation_mode !== "scheduled")) {
    return NextResponse.json({ error: "กรุณาตรวจชื่อปลายทาง สกุลเงิน และช่วงวันเดินทาง" }, { status: 400 });
  }

  const rate = Number(body.exchange_rate_to_thb);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1_000_000) {
    return NextResponse.json({ error: "กรุณาใส่อัตราแลกเปลี่ยนบาทต่อ 1 หน่วยให้ถูกต้อง" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.from("travel_trips").insert({
      user_id: auth.user.id,
      name: body.name.trim(),
      destination: body.destination.trim(),
      currency: body.currency,
      start_date: body.start_date,
      end_date: body.end_date,
      activation_mode: body.activation_mode as TravelActivationMode,
      is_active: body.activation_mode === "scheduled",
      exchange_rate_to_thb: rate,
      time_zone: "Asia/Bangkok",
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ trip: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
