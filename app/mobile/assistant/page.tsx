import MobileAssistantScreen from "@/components/assistant/MobileAssistantScreen";
import { getRequestLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
export default async function MobileAssistant() {
  const t = translations[await getRequestLocale()];
  return <MobileAssistantScreen title={t.assistant.title} subtitle={t.assistant.subtitle} />;
}
