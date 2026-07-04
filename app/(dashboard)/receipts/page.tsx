import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getReceipts } from "@/services/receipts";
import { getUserSettings } from "@/services/userSettings";
import { translations, Locale } from "@/lib/i18n/translations";
import ReceiptUploader from "@/components/receipts/ReceiptUploader";
import ReceiptList from "@/components/receipts/ReceiptList";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const receipts = await getReceipts(supabase);
  const locale = await getServerLocale();
  const t = translations[locale];

  const settings = userData?.user
    ? await getUserSettings(supabase, userData.user.id)
    : null;
  const currency = settings?.currency ?? "THB";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t.receipts.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t.receipts.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t.receipts.upload}
          </h2>
          <ReceiptUploader />
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t.receipts.history}
          </h2>
          <ReceiptList receipts={receipts} currency={currency} />
        </div>
      </div>
    </div>
  );
}