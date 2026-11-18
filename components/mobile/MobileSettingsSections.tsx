"use client";

import SettingsForm from "@/components/settings/SettingsForm";
import type { UserSettings } from "@/types";

export default function MobileSettingsSections({ settings, userEmail, userId, initialProfileOpen = false }: {
  settings: UserSettings | null;
  userEmail: string;
  userId: string;
  initialProfileOpen?: boolean;
}) {
  return <SettingsForm collapsible initialProfileOpen={initialProfileOpen} initialSettings={settings} userEmail={userEmail} userId={userId} />;
}
