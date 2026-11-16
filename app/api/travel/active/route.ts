import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveTravelTrips } from "@/services/travelTrips";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ trips: await getActiveTravelTrips(supabase, auth.user.id) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
