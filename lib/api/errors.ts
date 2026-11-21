import { isReportedMigrationError } from "./rpcMigration.mjs";
import { NextResponse } from "next/server";

export function logApiError(error: unknown) {
  if (isReportedMigrationError(error)) return;
  let source = error;
  for (let depth = 0; depth < 3 && source && typeof source === "object"; depth++) {
    const cause = (source as { cause?: unknown }).cause;
    if (!cause || typeof cause !== "object" || typeof (cause as { message?: unknown }).message !== "string") break;
    source = cause;
  }
  const message = source && typeof source === "object" && typeof (source as { message?: unknown }).message === "string" ? (source as { message: string }).message : "Unknown API failure";
  // Message only: never serialize error objects, details, stacks or request data.
  const safe = message.replace(/https?:\/\/\S+/gi, "[redacted URL]").replace(/\b(?:Bearer\s+\S+|sk-[\w-]+|AIza[\w-]+|sb_secret_[\w-]+|eyJ[\w.-]+)/g, "[redacted credential]").replace(/"[^"\r\n]*"|'[^'\r\n]*'/g, "[redacted value]").split(/[\r\n]/, 1)[0].slice(0, 500);
  console.error(safe);
}
export function apiError(error: unknown, publicMessage = "Internal server error", status = 500) {
  logApiError(error);
  return NextResponse.json({ error: publicMessage }, { status });
}
