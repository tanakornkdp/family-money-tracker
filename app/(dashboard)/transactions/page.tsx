import { getUser } from "@/lib/auth/getUser";
import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getTransactions } from "@/services/transactions";
import { getTripNames } from "@/services/travelTrips";
import { getDisplayNamesByUserIds } from "@/services/userSettings";
import { getCategoryIconMap } from "@/services/categories";
import { translations, Locale } from "@/lib/i18n/translations";
import TransactionsPageClient from "@/components/transactions/TransactionsPageClient";
import { getCreditCards } from "@/services/creditCards";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function TransactionsPage() {
  const supabase = await createClient();
  const user = await getUser();
  const currentUserId = user?.id ?? "";
  const transactions = await getTransactions(supabase);
  const locale = await getServerLocale();
  const t = translations[locale];

  const settings = user
    ? await getCachedUserSettings(user.id)
    : null;
  const currency = settings?.currency ?? "THB";

  const userIds = transactions.map((tx) => tx.user_id);
  const [displayNames, tripNames] = await Promise.all([
    getDisplayNamesByUserIds(supabase, userIds),
    getTripNames(supabase, transactions),
  ]);
  const categoryIconMap = await getCategoryIconMap(supabase);
  const cards = await getCreditCards(supabase);
  const cardNames = Object.fromEntries(cards.map((card) => [card.id, card.name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t.transactions.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t.transactions.subtitle}
        </p>
      </div>

      <TransactionsPageClient
        transactions={transactions}
        displayNames={displayNames}
        currentUserId={currentUserId}
        currency={currency}
        initialCategoryIconMap={categoryIconMap}
        cardNames={cardNames}
        cards={cards}
        tripNames={tripNames}
      />
    </div>
  );
}
