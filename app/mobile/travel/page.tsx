import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getTravelTrips, getCurrentlyActiveTrips } from "@/services/travelTrips";
import MobileTravelManager from "@/components/mobile/MobileTravelManager";
import TripTransferInbox from "@/components/mobile/TripTransferInbox";

export default async function MobileTravelPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const trips = await getTravelTrips(supabase, user.id);
  const activeTripIds = getCurrentlyActiveTrips(trips).map((trip) => trip.id);
  return <main><TripTransferInbox userId={user.id} /><MobileTravelManager initialTrips={trips} activeTripIds={activeTripIds} /></main>;
}
