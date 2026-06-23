import { requireUser } from "@/lib/auth/helpers";
import { getReportSummary } from "@/lib/actions/report";
import { getTimeEntriesForWeek } from "@/lib/actions/log";
import { jstStartOfWeek } from "@/lib/utils/date";
import { ReportsPageClient } from "@/components/reports";

export default async function ReportsPage() {
  await requireUser();
  const weekStart = jstStartOfWeek(new Date());
  const [initialEntries, initialSummary] = await Promise.all([
    getTimeEntriesForWeek(weekStart),
    getReportSummary({ period: "week", anchorDate: new Date() }),
  ]);
  return (
    <ReportsPageClient
      initialEntries={initialEntries}
      initialSummary={initialSummary}
    />
  );
}
