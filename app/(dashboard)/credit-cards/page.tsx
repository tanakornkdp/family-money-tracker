import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getCardsWithBalance } from "@/services/creditCards";
import { getUserSettings } from "@/services/userSettings";
import { translations, Locale } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import CreditCardsManager from "@/components/credit-cards/CreditCardsManager";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function CreditCardsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getServerLocale();
  const t = translations[locale];
  const settings = await getUserSettings(supabase, user.id);
  const currency = settings?.currency ?? "THB";
  const cards = await getCardsWithBalance(supabase);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t.creditCards.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.creditCards.subtitle}</p>
      </div>
      <CreditCardsManager initialCards={cards} userId={user.id} currency={currency} />
    </div>
  );
}