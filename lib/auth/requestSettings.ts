import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/services/userSettings";

// React cache is scoped to the server render, not a shared/persistent user cache.
// Only primitive keys: different Supabase client objects must not defeat reuse.
export const getCachedUserSettings = cache(async (userId: string) => {
  const supabase = await createClient();
  return getUserSettings(supabase, userId);
});
