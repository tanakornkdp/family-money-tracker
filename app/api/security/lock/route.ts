import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
const COOKIE = "finance_privacy_lock";
export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const response = NextResponse.json({ locked: true });
  response.cookies.set(COOKIE, "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let password = "";
  try { password = (await request.json()).password; } catch { /* invalid body */ }
  if (typeof password !== "string" || !password) return NextResponse.json({ error: "กรุณากรอกรหัสผ่าน" }, { status: 400 });
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email ?? "", password });
  if (signInError) return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง หรือเชื่อมต่อไม่สำเร็จ" }, { status: 401 });
  const response = NextResponse.json({ unlocked: true });
  response.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
