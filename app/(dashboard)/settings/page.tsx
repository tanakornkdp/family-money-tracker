import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { requireUser } from "@/lib/auth/getUser";

import SettingsForm from "@/components/settings/SettingsForm";
import BackupRestore from "@/components/backup/BackupRestore";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getCachedUserSettings(user.id);

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
      <BackupRestore />
    </div>
  );
}
