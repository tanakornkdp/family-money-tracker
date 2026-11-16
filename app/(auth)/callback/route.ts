import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordVerifiedSignIn } from "@/services/securityActivity";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const destination = getSafeDestination(next);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await recordVerifiedSignIn(supabase, request.headers.get("user-agent")).catch(() => undefined);
      return redirectToPath(destination);
    }
  }

  if (destination === "/reset-password" || searchParams.get("error_code") === "otp_expired") {
    return redirectToPath("/forgot-password?error=reset_link_invalid");
  }
  return redirectToPath("/login?error=auth_callback_error");
}

function getSafeDestination(next: string | null): string {
  if (!next?.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/dashboard";
  }
  const base = "https://app.invalid";
  const url = new URL(next, base);
  if (url.origin !== base || url.pathname.startsWith("//")) return "/dashboard";
  return `${url.pathname}${url.search}${url.hash}`;
}

function redirectToPath(path: string): Response {
  // A relative Location keeps the browser's public origin behind a proxy.
  return new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });
}
