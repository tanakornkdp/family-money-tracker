import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/services/userSettings";
import PageTransition from "@/components/layout/PageTransition";
import MobileShell from "@/components/layout/MobileShell";
import { requireUser } from "@/lib/auth/getUser";
import UserPreferencesSync from "@/components/providers/UserPreferencesSync";
import { cookies } from "next/headers";
import LockedScreen from "@/components/security/LockedScreen";
import IdleLockProvider from "@/components/security/IdleLockProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const settings = await getUserSettings(supabase, user.id);
  const cookieStore = await cookies();
  if (cookieStore.get("finance_privacy_lock")?.value === "1") return <LockedScreen email={user.email ?? ""}/>;

  return (
    <IdleLockProvider email={user.email ?? ""} timeoutMinutes={settings?.lock_timeout_minutes ?? 5}>
    <div className="min-h-screen bg-gray-50/70 transition-colors supports-[height:100dvh]:min-h-dvh dark:bg-slate-950">
      <UserPreferencesSync language={settings?.language} theme={settings?.theme} />
      {/* Background accent blobs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[350px] h-[350px] bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10">
        <Topbar
          userId={user.id}
          userEmail={user.email}
          avatarUrl={settings?.avatar_url}
          fullName={settings?.full_name}
        />

        <div className="flex">
          <Sidebar />
            <main className="min-h-[calc(100vh-65px)] flex-1 p-4 pb-28 supports-[height:100dvh]:min-h-[calc(100dvh-65px)] sm:p-6 sm:pb-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
        <MobileShell />
      </div>
    </div>
    </IdleLockProvider>
  );
}
