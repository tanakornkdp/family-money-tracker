import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getFuturePlanData } from "@/services/futureMoneyPlans";
import FutureMoneyPlans from "@/components/money-plans/FutureMoneyPlans";

export default async function MobileMoneyPlans() {
  const user = await requireUser();
  return <FutureMoneyPlans initialData={await getFuturePlanData(await createClient())} userId={user.id} />;
}
