import { fmtShort } from "@/lib/format";
import type { ReportBreakdownItem } from "@/types";

type Props = {
  title: string;
  items: ReportBreakdownItem[];
  totalSec: number;
};

export function BreakdownList({ title, items, totalSec }: Props) {
  return (
    <div className="rounded-[9px] border border-[var(--fl-border)] bg-[var(--fl-panel)] p-4">
      <div className="mb-3 text-[12px] font-[500] text-[var(--fl-text)]">
        {title}
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="text-[12px] text-[var(--fl-text-subtle)]">
            データがありません
          </div>
        ) : (
          items.slice(0, 6).map((item) => {
            const pct =
              totalSec > 0 ? Math.round((item.seconds / totalSec) * 100) : 0;
            return (
              <div
                key={`${item.id ?? "none"}-${item.name}`}
                className="flex flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: item.color ?? "var(--fl-brand)" }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--fl-text)]">
                    {item.name}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--fl-text-muted)]">
                    {fmtShort(item.seconds)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fl-border-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--fl-brand)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
