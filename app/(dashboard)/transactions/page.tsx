import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getTransactions } from "@/services/transactions";
import { getDisplayNamesByUserIds, getUserSettings, getUserProfilesByIds } from "@/services/userSettings";
import { getCategoryIconMap } from "@/services/categories";
import { translations, Locale } from "@/lib/i18n/translations";
import TransactionsPageClient from "@/components/transactions/TransactionsPageClient";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData?.user?.id ?? "";
  const transactions = await getTransactions(supabase);
  const locale = await getServerLocale();
  const t = translations[locale];

  const settings = userData?.user
    ? await getUserSettings(supabase, userData.user.id)
    : null;
  const currency = settings?.currency ?? "THB";

  const userIds = transactions.map((tx) => tx.user_id);
  const userProfiles = await getUserProfilesByIds(supabase, userIds);
  
  if (currentUserId) {
    userProfiles[currentUserId] = {
      name: settings?.full_name || userData?.user?.user_metadata?.full_name || userData?.user?.email?.split("@")[0] || "You",
      avatarUrl: settings?.avatar_url || userData?.user?.user_metadata?.avatar_url || null,
    };
  }

  console.log("SERVER SIDE - userProfiles:", userProfiles, "currentUserId:", currentUserId);

  const displayNames = await getDisplayNamesByUserIds(supabase, userIds);
  const categoryIconMap = await getCategoryIconMap(supabase);

  const serverSideDebug = {
    userIds,
    currentUserId,
    userProfiles,
    hasSettings: !!settings,
    settingsFullName: settings?.full_name || null,
    settingsAvatarUrl: settings?.avatar_url || null,
    userDataEmail: userData?.user?.email || null,
  };

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
        userProfiles={userProfiles}
        serverSideDebug={serverSideDebug}
      />
    </div>
  );
}