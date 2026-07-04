import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getUserHouseholds, getPendingInvitesForUser } from "@/services/households";
import { translations, Locale } from "@/lib/i18n/translations";
import HouseholdManager from "@/components/household/HouseholdManager";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function HouseholdPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getServerLocale();
  const t = translations[locale];

  const households = await getUserHouseholds(supabase);
  const pendingInvites = await getPendingInvitesForUser(supabase, user.email ?? "");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t.household.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t.household.subtitle}
        </p>
      </div>

      <HouseholdManager
        initialHouseholds={households}
        initialInvites={pendingInvites}
        userId={user.id}
      />
    </div>
  );
}