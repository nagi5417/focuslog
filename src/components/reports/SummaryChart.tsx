import { fmtShort } from "@/lib/format";
import type { ReportSeriesPoint } from "@/types";

type Props = {
  points: ReportSeriesPoint[];
};

export function SummaryChart({ points }: Props) {
  const max = Math.max(...points.map((point) => point.seconds), 1);

  return (
    <div className="rounded-[9px] border border-[var(--fl-border)] bg-[var(--fl-panel)] p-4">
      <div className="mb-3 text-[12px] font-[500] text-[var(--fl-text)]">
        推移
      </div>
      <div className="flex h-[150px] items-end gap-1.5">
        {points.map((point) => {
          const height = Math.max(4, (point.seconds / max) * 120);
          return (
            <div
              key={point.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
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
              <span className="truncate font-mono text-[10px] text-[var(--fl-text-subtle)]">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
