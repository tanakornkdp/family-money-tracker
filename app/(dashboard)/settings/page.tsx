import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/services/userSettings";
import SettingsForm from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const settings = await getUserSettings(supabase, user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Settings / ตั้งค่า
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your account preferences
        </p>
      </div>

      <SettingsForm
        initialSettings={settings}
        userEmail={user.email ?? ""}
        userId={user.id}
      />
    </div>
  );
}