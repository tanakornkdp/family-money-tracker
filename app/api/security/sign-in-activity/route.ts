import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordVerifiedSignIn } from "@/services/securityActivity";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("sign_in_activity").select("id,device_label,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
  if (error) return NextResponse.json({ error: "Unable to load sign-in history" }, { status: 500 });
  return NextResponse.json({ activity: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await recordVerifiedSignIn(supabase, request.headers.get("user-agent")); }
  catch { return NextResponse.json({ error: "Unable to record sign-in" }, { status: 500 }); }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
