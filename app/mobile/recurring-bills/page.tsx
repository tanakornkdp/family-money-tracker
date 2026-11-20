import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/services/categories";
import { getCreditCards } from "@/services/creditCards";
import { getUserHouseholds } from "@/services/households";

import { Locale } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import RecurringBillsManager from "@/components/recurring-bills/RecurringBillsManager";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function RecurringBillsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getServerLocale();


  const categories = await getCategories(supabase);
  const creditCards = await getCreditCards(supabase);
  const households = await getUserHouseholds(supabase);
  const settings = await getCachedUserSettings(user.id);
  const currency = settings?.currency ?? "THB";

  return (
    <div className="flex flex-col h-full min-h-0 space-y-6">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {locale === "th" ? "รายการประจำ & บริการรายเดือน" : "Recurring Bills & Subscriptions"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {locale === "th" 
            ? "ตั้งค่าและติดตามค่าใช้จ่ายประจำล่วงหน้า พยากรณ์รายจ่าย และบันทึกอัตโนมัติ" 
            : "Manage and track recurring expenses, forecast budgets, and auto-generate transactions."}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        <RecurringBillsManager
          userId={user.id}
          initialCategories={categories}
          initialCreditCards={creditCards}
          initialHouseholds={households}
          currency={currency}
          locale={locale}
        />
      </div>
    </div>
  );
}
