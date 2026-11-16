import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();
  const browserProxy = process.env.NEXT_PUBLIC_SUPABASE_BROWSER_PROXY;
  if (process.env.NODE_ENV === "development" && browserProxy && typeof window !== "undefined") {
    const origin = new URL(url).origin;
    return createBrowserClient(url, anonKey, {
      global: {
        fetch(input, init) {
          if (input instanceof Request) return fetch(input, init);
          const target = new URL(input);
          if (target.origin !== origin) return fetch(input, init);
          return fetch(browserProxy + target.pathname + target.search, init);
        },
      },
    });
  }
  return createBrowserClient(url, anonKey);
}
