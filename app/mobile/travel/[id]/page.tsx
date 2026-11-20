import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getTravelTrips } from "@/services/travelTrips";
import { getTransactions } from "@/services/transactions";

import MobileTravelTripDetail from "@/components/mobile/MobileTravelTripDetail";
import { getUserHouseholds, getHouseholdMembers } from "@/services/households";

export default async function MobileTravelTripPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user, supabase] = await Promise.all([params, requireUser(), createClient()]);
  const [trips, transactions, settings] = await Promise.all([
    getTravelTrips(supabase, user.id),
    getTransactions(supabase, { userIds: [user.id] }),
    getCachedUserSettings(user.id),
  ]);
  const trip = trips.find((item) => item.id === id);
  if (!trip) notFound();

  const linked = transactions.filter((item) => item.travel_trip_id === trip.id);
  const available = transactions.filter((item) =>
    item.type === "expense" && !item.travel_trip_id && item.date >= trip.start_date && item.date <= trip.end_date,
  );

  const groups = await getUserHouseholds(supabase);
  const contacts = (await Promise.all(groups.map(async group =>
    (await getHouseholdMembers(supabase, group.id)).map(member => ({
      id: member.user_id,
      name: member.display_name || member.user_id.slice(0, 8),
      group: group.name,
    })),
  ))).flat();
  const accounts = [...new Map(contacts.map(person => [person.id, person])).values()];
  return <MobileTravelTripDetail trip={trip} transactions={linked} availableTransactions={available} accountCurrency={settings?.currency ?? "THB"} accounts={accounts} />;
}
