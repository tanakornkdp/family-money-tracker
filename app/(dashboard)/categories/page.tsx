import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/services/categories";
import { translations, Locale } from "@/lib/i18n/translations";
import { cookies } from "next/headers";
import CategoriesManager from "@/components/categories/CategoriesManager";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function CategoriesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getServerLocale();
  const t = translations[locale];

  const categories = await getCategories(supabase);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t.categories.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.categories.subtitle}</p>
      </div>

      <CategoriesManager initialCategories={categories} userId={user.id} />
    </div>
  );
}