import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { requireUser } from "@/lib/auth/getUser";

import MobileSettingsSections from "@/components/mobile/MobileSettingsSections";
import { Locale, translations } from "@/lib/i18n/translations";
import { getRequestLocale } from "@/lib/i18n/server";
import BackupRestore from "@/components/backup/BackupRestore";
import MobileHomeCardPreferences from "@/components/mobile/MobileHomeCardPreferences";
export default async function MobileSettings({searchParams}:{searchParams:Promise<{section?:string}>}){const profileOpen=(await searchParams).section==="profile";const user=await requireUser();const locale:Locale=await getRequestLocale();const settings=await getCachedUserSettings(user.id);const t=translations[locale];return <main className="space-y-5"><header className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 p-5 text-white"><p className="text-sm text-white/65">{t.settings.mobileAccount}</p><h1 className="mt-1 text-2xl font-bold">{t.settings.title}</h1><p className="mt-1 text-sm text-white/65">{locale==="th"?"แตะหัวข้อเพื่อดูและแก้ไขรายละเอียด":"Choose a section to view and edit its details"}</p></header><MobileSettingsSections key={String(profileOpen)} initialProfileOpen={profileOpen} settings={settings} userEmail={user.email??""} userId={user.id}/><MobileHomeCardPreferences /><BackupRestore /></main>}
