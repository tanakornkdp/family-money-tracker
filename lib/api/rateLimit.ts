import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { RATE_LIMITS, parseRateLimitDecision } from "./rateLimitPolicy";

export async function enforceApiRateLimit(client: SupabaseClient, endpoint: keyof typeof RATE_LIMITS) {
  const config = RATE_LIMITS[endpoint];
  let data: unknown;
  try {
    const result = await client.rpc("check_rate_limit", { p_key: config.key, p_limit: config.limit, p_window_seconds: config.windowSeconds });
    if (result.error) throw new Error("Rate limit RPC failed");
    data = result.data;
  } catch {
    // Only transport/database call failures fail open. Never log their payload.
    console.error("API rate-limit check failed");
    return null;
  }
  try {
    const decision = parseRateLimitDecision(data);
    if (!decision.allowed) return NextResponse.json({ error: "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(decision.retryAfter) } });
  } catch {
    console.error("API rate-limit decision invalid");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return null;
}
