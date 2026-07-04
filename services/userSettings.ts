import { SupabaseClient } from "@supabase/supabase-js";
import { UserSettings } from "@/types";

export async function getUserSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as UserSettings | null;
}

export async function upsertUserSettings(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Pick<UserSettings, "currency" | "language" | "theme" | "full_name" | "avatar_url">>
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as UserSettings;
}

export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function getDisplayNamesByUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, full_name")
    .in("user_id", uniqueIds);

  if (error) throw new Error(error.message);

  const map: Record<string, string> = {};
  for (const row of data as { user_id: string; full_name: string | null }[]) {
    map[row.user_id] = row.full_name?.trim() || "";
  }
  return map;
}

export async function getUserProfilesByIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Record<string, { name: string; avatarUrl: string | null }>> {
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, full_name, avatar_url")
    .in("user_id", uniqueIds);

  if (error) throw new Error(error.message);

  const map: Record<string, { name: string; avatarUrl: string | null }> = {};
  for (const row of data as { user_id: string; full_name: string | null; avatar_url: string | null }[]) {
    map[row.user_id] = {
      name: row.full_name?.trim() || row.user_id.slice(0, 8),
      avatarUrl: row.avatar_url,
    };
  }
  return map;
}