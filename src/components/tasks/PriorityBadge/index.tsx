import { cn } from "@/lib/utils";
import type { Priority } from "@/types/task";

type Props = {
  prio: Priority;
  className?: string;
};

const LABEL: Record<Priority, string> = { high: "高", mid: "中", low: "低" };

const DOT_CLASS: Record<Priority, string> = {
  high: "bg-pri-high",
  mid: "bg-pri-mid",
  low: "bg-pri-low",
};

const TEXT_CLASS: Record<Priority, string> = {
  high: "text-pri-high",
  mid: "text-pri-mid",
  low: "text-pri-low",
};

export function PriorityBadge({ prio, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10.5px]",
        TEXT_CLASS[prio],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT_CLASS[prio])} />
      {LABEL[prio]}
    </span>
  );
}
