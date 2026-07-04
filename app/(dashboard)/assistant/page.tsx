import { cookies } from "next/headers";
import { translations, Locale } from "@/lib/i18n/translations";
import ChatWindow from "@/components/assistant/ChatWindow";

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  return localeCookie === "en" ? "en" : "th";
}

export default async function AssistantPage() {
  const locale = await getServerLocale();
  const t = translations[locale];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {t.assistant.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t.assistant.subtitle}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 h-[600px] flex flex-col">
        <ChatWindow />
      </div>
    </div>
  );
}