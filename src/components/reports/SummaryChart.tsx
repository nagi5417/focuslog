import { fmtShort } from "@/lib/format";
import type { ReportPeriod, ReportSeriesPoint } from "@/types";

type Props = {
  points: ReportSeriesPoint[];
  period: ReportPeriod;
};

export function SummaryChart({ points, period }: Props) {
  const max = Math.max(...points.map((point) => point.seconds), 1);
  const isMonthly = period === "month";
  const chartWidth = isMonthly ? points.length * 34 : undefined;

  return (
    <div className="min-w-0 rounded-[9px] border border-[var(--fl-border)] bg-[var(--fl-panel)] p-4">
      <div className="mb-3 text-[12px] font-[500] text-[var(--fl-text)]">
        推移
      </div>
      <div
        className={
          isMonthly
            ? "-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-1"
            : "min-w-0 overflow-hidden pb-1"
        }
        data-testid="summary-chart-frame"
      >
        <div
          className={
            isMonthly
              ? "flex h-[150px] min-w-full items-end gap-1.5"
              : "flex h-[150px] min-w-0 items-end gap-1.5"
          }
          data-testid="summary-chart-bars"
          style={{ width: chartWidth }}
        >
          {points.map((point) => {
            const height = Math.max(4, (point.seconds / max) * 120);
            return (
              <div
                key={point.label}
                className={
                  isMonthly
                    ? "flex w-7 shrink-0 flex-col items-center gap-1"
                    : "flex min-w-0 flex-1 flex-col items-center gap-1"
                }
                title={`${point.label}: ${fmtShort(point.seconds)}`}
              >
                <div className="flex h-[120px] w-full items-end">
                  <div
                    className="w-full rounded-t-[4px] bg-[linear-gradient(180deg,var(--fl-brand-2),var(--fl-brand))]"
                    style={{
                      height,
                      boxShadow: "0 0 12px var(--fl-brand-glow)",
                    }}
                  />
                </div>
                <span className="h-3 max-w-full truncate font-mono text-[10px] text-[var(--fl-text-subtle)]">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
