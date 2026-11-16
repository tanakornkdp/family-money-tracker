import { cookies } from "next/headers";
import { Locale } from "@/lib/i18n/translations";

export async function getRequestLocale(fallback: Locale = "th"): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("app_locale")?.value;
  return locale === "en" || locale === "th" ? locale : fallback;
}
