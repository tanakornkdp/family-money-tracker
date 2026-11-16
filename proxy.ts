import { NextResponse, userAgent, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/" && ["mobile", "tablet"].includes(userAgent(request).device.type ?? "")) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/mobile/dashboard";
    const response = NextResponse.redirect(destination);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
