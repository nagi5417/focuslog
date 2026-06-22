import { requireUser } from "@/lib/auth/helpers";
import { getTimeEntriesForWeek } from "@/lib/actions/log";
import { jstStartOfWeek } from "@/lib/utils/date";
import { ReportsPageClient } from "@/components/reports";

export default async function ReportsPage() {
  await requireUser();
  const weekStart = jstStartOfWeek(new Date());
  const initialEntries = await getTimeEntriesForWeek(weekStart);
  return <ReportsPageClient initialEntries={initialEntries} />;
}
