import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getBudgetPlans } from "@/services/budgetPlans";
import { getUserHouseholds } from "@/services/households";
import { getUserSettings } from "@/services/userSettings";
import { translations, Locale } from "@/lib/i18n/translations";
import BudgetCalendarManager from "@/components/budget/BudgetCalendarManager";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function BudgetPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getServerLocale();
  const t = translations[locale];

  const plans = await getBudgetPlans(supabase);
  const households = await getUserHouseholds(supabase);
  const settings = await getUserSettings(supabase, user.id);
  const currency = settings?.currency ?? "THB";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t.budget.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.budget.subtitle}</p>
      </div>

      <BudgetCalendarManager
        initialPlans={plans}
        households={households}
        userId={user.id}
        currency={currency}
      />
    </div>
  );
}