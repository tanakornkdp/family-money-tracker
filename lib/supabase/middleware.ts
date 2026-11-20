import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname === "/mobile" ||
    pathname.startsWith("/mobile/") ||
    /^\/(dashboard|transactions|categories|credit-cards|recurring-bills|receipts|assistant|household|goals|budget|settings|desktop|money-plans|reports)(\/|$)/.test(pathname);

  const refreshedHeaders = new Headers();
  const redirectToLogin = () => {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(loginUrl);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    refreshedHeaders.forEach((value, key) => redirectResponse.headers.set(key, value));
    return redirectResponse;
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY." },
        { status: 503 }
      );
    }
    return isProtectedRoute ? redirectToLogin() : response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          const previous = response.cookies.getAll();
          response = NextResponse.next({ request: { headers: request.headers } });
          for (const cookie of previous) response.cookies.set(cookie);
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) refreshedHeaders.set(key, value);
          refreshedHeaders.forEach((value, key) => response.headers.set(key, value));
        },
      },
    }
  );

  try {
    const { data, error } = await supabase.auth.getUser();
    if (isProtectedRoute && (error || !data.user)) return redirectToLogin();
  } catch {
    if (isProtectedRoute) return redirectToLogin();
  }

  return response;
}
