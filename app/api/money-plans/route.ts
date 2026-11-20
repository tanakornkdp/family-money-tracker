import { apiError } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { futurePlanSchema } from "@/lib/validation/futureMoneyPlans";

export async function POST(request: NextRequest) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
  const body = await request.json().catch(() => null);
  if (body?.action === "save") {
    const parsed = futurePlanSchema.safeParse(body.plan);
    if (!parsed.success || (body.id && !z.uuid().safeParse(body.id).success) || (body.id && !z.number().int().positive().safeParse(body.revision).success)) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const query = body.id
      ? client.from("future_money_plans").update(parsed.data).eq("id", body.id).eq("revision", body.revision)
      : client.from("future_money_plans").insert({ ...parsed.data, user_id: user.id });
    const { data, error } = await query.select().maybeSingle();
    if (error) return apiError(error, "save", 400);
    if (!data) return NextResponse.json({ error: "conflict" }, { status: 409 });
    return NextResponse.json({ plan: data });
  }
  if (body?.action === "link") {
    const parsed = z.object({ plan_id: z.uuid(), allocation_id: z.uuid().nullable(), transaction_id: z.uuid().nullable(), contribution_id: z.uuid().nullable() }).refine(v => Number(Boolean(v.transaction_id)) + Number(Boolean(v.contribution_id)) === 1).safeParse(body.link);
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const { data, error } = await client.from("future_money_plan_links").insert({ ...parsed.data, user_id: user.id }).select().single();
    if (error) return error.code === "23505" ? NextResponse.json({ error: "already_linked" }, { status: 400 }) : apiError(error, "link", 400);
    return NextResponse.json({ link: data });
  }
  if (body?.action === "unlink" && z.uuid().safeParse(body.id).success) {
    const { data, error } = await client.from("future_money_plan_links").delete().eq("id", body.id).select("id").maybeSingle();
    if (error) return apiError(error, "unlink", 400);
    if (!data) return NextResponse.json({ error: "unlink" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid" }, { status: 400 });
  } catch (error) { return apiError(error); }
}
