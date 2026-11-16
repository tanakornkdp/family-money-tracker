import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getTransactions } from "@/services/transactions";
import { getTripNames } from "@/services/travelTrips";
import { getUserSettings } from "@/services/userSettings";
import TransactionForm from "@/components/transactions/TransactionForm";
import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { getCreditCards } from "@/services/creditCards";
import { getDisplayNamesByUserIds } from "@/services/userSettings";
import MobileTransactionsList from "@/components/transactions/MobileTransactionsList";
import TransactionImportExport from "@/components/transactions/TransactionImportExport";

export default async function MobileTransactions({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; focus?: string }>;
}) {
  const user = await requireUser();
  const [{ new: newParam, focus }, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);
  const [transactions, settings, cards] = await Promise.all([
    getTransactions(supabase),
    getUserSettings(supabase, user.id),
    getCreditCards(supabase),
  ]);
  const [displayNames, tripNames] = await Promise.all([
    getDisplayNamesByUserIds(supabase, transactions.map((tx) => tx.user_id)),
    getTripNames(supabase, transactions),
  ]);
  const cardNames = Object.fromEntries(cards.map((card) => [card.id, card.name]));
  const currency = settings?.currency ?? "THB";
  const locale = await getRequestLocale(settings?.language);
  const t = translations[locale];
  const showNew = newParam === "1";

  return (
    <main className="mobile-filter-page space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{t.household.personalView}</p>
          <h1 className="text-2xl font-bold">{t.transactions.title}</h1>
        </div>
        <Link
          href="/mobile/transactions?new=1"
          className="inline-flex min-h-12 items-center rounded-[14px] bg-primary-700 px-4 text-sm font-semibold text-white"
        >
          ＋ {t.transactions.addTransaction}
        </Link>
      </header>

      {showNew && (
        <section className="rounded-3xl bg-mobile-surface p-4 shadow-sm">
          <TransactionForm />
        </section>
      )}

      <MobileTransactionsList key={focus} focusId={focus} transactions={transactions} displayNames={displayNames} cardNames={cardNames} currency={currency} locale={locale} tripNames={tripNames} filterFooter={<TransactionImportExport compact transactions={transactions} cards={cards} locale={locale} />} />
    </main>
  );
}
