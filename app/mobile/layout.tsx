import MobileNavigation from "@/components/mobile/MobileNavigation";
import MobilePreferencesControls from "@/components/mobile/MobilePreferencesControls";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/services/userSettings";
import UserPreferencesSync from "@/components/providers/UserPreferencesSync";
import NotificationCenter from "@/components/NotificationCenter";
import { cookies } from "next/headers";
import LockedScreen from "@/components/security/LockedScreen";
import IdleLockProvider from "@/components/security/IdleLockProvider";

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const settings = await getUserSettings(supabase, user.id);
  const cookieStore = await cookies();
  if (cookieStore.get("finance_privacy_lock")?.value === "1") return <LockedScreen email={user.email ?? ""}/>;

  return (
    <IdleLockProvider email={user.email ?? ""} timeoutMinutes={settings?.lock_timeout_minutes ?? 5}>
    <div className="mobile-app-shell bg-mobile-page px-4 pt-[max(1rem,env(safe-area-inset-top))] text-mobile-ink">
      <UserPreferencesSync language={settings?.language} theme={settings?.theme} />
      <div className="mobile-app-content mx-auto w-full max-w-lg">
        <div className="mobile-app-toolbar mb-3 flex min-h-10 items-center justify-end gap-2">
          <NotificationCenter userId={user.id} compact />
          <MobilePreferencesControls userId={user.id} />
        </div>
        <div className="mobile-app-page [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-lg [&_input]:min-h-12 [&_button]:touch-manipulation">
          {children}
        </div>
      </div>
      <MobileNavigation />
    </div>
    </IdleLockProvider>
  );
}
