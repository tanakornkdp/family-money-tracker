import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getCardsWithBalance } from "@/services/creditCards";

import { translations, Locale } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import CreditCardsManager from "@/components/credit-cards/CreditCardsManager";
import AccountReconciliation from "@/components/credit-cards/AccountReconciliation";
import { getDashboardTotals } from "@/services/dashboardTotals";
import { reconciliationAccountsFromBalances } from "@/services/accountBalances";

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
  const [settings, totals, cards] = await Promise.all([
    getCachedUserSettings(user.id),
    getDashboardTotals(supabase),
    getCardsWithBalance(supabase),
  ]);
  const currency = settings?.currency ?? "THB";
  const accounts = reconciliationAccountsFromBalances(totals.accountCashBalance, totals.bankBalance, cards);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t.creditCards.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.creditCards.subtitle}</p>
      </div>
      <AccountReconciliation accounts={accounts} currency={currency} locale={locale} />
      <CreditCardsManager initialCards={cards} currency={currency} />
    </div>
  );
}
