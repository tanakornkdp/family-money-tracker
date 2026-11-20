import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const getUser = cache(async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
});

export const requireUser = cache(async () => {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
});
