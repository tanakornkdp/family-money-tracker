import type { SupabaseClient } from "@supabase/supabase-js";

export interface SecurityActivity { id: string; device_label: string; created_at: string }
export function getCoarseDeviceLabel(userAgent: string | null): string {
  const ua = userAgent ?? "";
  if (/iphone|ipad|android|mobile/i.test(ua)) return /iphone|ipad/i.test(ua) ? "Mobile · iOS" : "Mobile · Android";
  return /edg\//i.test(ua) ? "Desktop · Edge" : /firefox\//i.test(ua) ? "Desktop · Firefox" : /chrome\//i.test(ua) ? "Desktop · Chrome" : "Desktop browser";
}
export async function getSessionFingerprint(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("A verified session is required");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.session.access_token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function recordVerifiedSignIn(supabase: SupabaseClient, userAgent: string | null): Promise<void> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("A verified sign-in is required");
  const sessionKey = await getSessionFingerprint(supabase);
  const result = await supabase.from("sign_in_activity").upsert({ user_id: user.id, session_key: sessionKey, device_label: getCoarseDeviceLabel(userAgent) }, { onConflict: "session_key", ignoreDuplicates: true });
  if (result.error) throw new Error(result.error.message);
}
