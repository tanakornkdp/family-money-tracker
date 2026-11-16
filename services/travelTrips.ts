import type { SupabaseClient } from "@supabase/supabase-js";
import type { TravelTrip } from "@/types";

export type TravelTripInput = Pick<
  TravelTrip,
  | "name"
  | "destination"
  | "currency"
  | "start_date"
  | "end_date"
  | "activation_mode"
  | "exchange_rate_to_thb"
>;

export async function getTravelTrips(
  supabase: SupabaseClient,
  userId: string,
): Promise<TravelTrip[]> {
  const { data, error } = await supabase
    .from("travel_trips")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TravelTrip[];
}

export async function getTripNames(supabase: SupabaseClient, transactions: { travel_trip_id?: string | null }[]): Promise<Record<string, string>> {
  const ids = [...new Set(transactions.flatMap(tx => tx.travel_trip_id ? [tx.travel_trip_id] : []))];
  const batches = Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, (index + 1) * 100));
  const results = await Promise.all(batches.map(batch => supabase.from("travel_trips").select("id,name").in("id", batch)));
  return Object.fromEntries(results.flatMap(({ data }) => (data ?? []).map(trip => [trip.id, trip.name])));
}

function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getCurrentlyActiveTrips(
  trips: TravelTrip[],
  now = new Date(),
): TravelTrip[] {
  return trips.filter((trip) => {
    if (!trip.is_active) return false;
    if (trip.activation_mode === "manual") return true;
    const today = dateInTimeZone(now, trip.time_zone || "Asia/Bangkok");
    return trip.start_date <= today && today <= trip.end_date;
  });
}

export async function getActiveTravelTrips(
  supabase: SupabaseClient,
  userId: string,
): Promise<TravelTrip[]> {
  return getCurrentlyActiveTrips(await getTravelTrips(supabase, userId));
}
