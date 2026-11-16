import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getReceipts } from "@/services/receipts";
import { getUserSettings } from "@/services/userSettings";
import ReceiptUploader from "@/components/receipts/ReceiptUploader";
import ReceiptList from "@/components/receipts/ReceiptList";
import { getRequestLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";

export default async function MobileReceipts() {
  const user = await requireUser();
  const supabase = await createClient();
  const [receipts, settings] = await Promise.all([
    getReceipts(supabase),
    getUserSettings(supabase, user.id),
  ]);
  const currency = settings?.currency ?? "THB";
  const locale = await getRequestLocale(settings?.language);
  const t = translations[locale];

  return (
    <main className="space-y-5">
      <header>
        <p className="text-sm text-slate-500">{t.receipts.title}</p>
        <h1 className="text-2xl font-bold">{t.receipts.title}</h1>
        <p className="text-sm text-slate-500">{t.receipts.subtitle}</p>
      </header>
      <section className="rounded-3xl bg-mobile-surface p-4 shadow-sm">
        <ReceiptUploader />
      </section>
      <section className="rounded-3xl bg-mobile-surface p-4 shadow-sm">
        <h2 className="mb-3 font-bold">{t.receipts.history}</h2>
        <ReceiptList receipts={receipts} currency={currency} userId={user.id} />
      </section>
    </main>
  );
}
