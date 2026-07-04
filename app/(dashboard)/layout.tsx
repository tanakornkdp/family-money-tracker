import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/services/userSettings";
import PageTransition from "@/components/layout/PageTransition";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const settings = userData?.user
    ? await getUserSettings(supabase, userData.user.id)
    : null;

  return (
    <div className="min-h-screen bg-gray-50/70 dark:bg-slate-950 transition-colors">
      {/* Background accent blobs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[350px] h-[350px] bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10">
        <Topbar
          userEmail={userData?.user?.email}
          avatarUrl={settings?.avatar_url}
          fullName={settings?.full_name}
        />

        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-65px)]">
            <div className="max-w-6xl mx-auto">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}