import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import ExpenseReports from "@/components/reports/ExpenseReports";
import { loadExpenseReportData } from "@/services/expenseReports";

export default async function MobileReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const data = await loadExpenseReportData(supabase, user.id, searchParams);
  return <ExpenseReports data={data} />;
}
