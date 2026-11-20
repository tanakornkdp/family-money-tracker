import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getGoals, getGoalContributionSummaries } from "@/services/goals";
import { getUserHouseholds } from "@/services/households";

import { translations, Locale } from "@/lib/i18n/translations";
import GoalsManager from "@/components/goals/GoalsManager";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function GoalsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getServerLocale();
  const t = translations[locale];

  const goals = await getGoals(supabase);
  const contributionSummaries = await getGoalContributionSummaries(supabase, goals.filter((goal) => goal.household_id));
  const households = await getUserHouseholds(supabase);
  const settings = await getCachedUserSettings(user.id);
  const currency = settings?.currency ?? "THB";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t.goals.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t.goals.subtitle}
        </p>
      </div>

      <GoalsManager
        initialGoals={goals}
        households={households}
        userId={user.id}
        currency={currency}
        contributionSummaries={contributionSummaries}
      />
    </div>
  );
}
