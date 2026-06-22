import { fmtHM } from "@/lib/format";
import type { TimeEntryBlock } from "@/types/report";

type Props = {
  block: TimeEntryBlock;
  rowPx: number;
  selected: boolean;
  onClick: (block: TimeEntryBlock, el: HTMLDivElement) => void;
};

export function TimelineBlock({ block, rowPx, selected, onClick }: Props) {
  const top = (block.start / 60) * rowPx;
  const minHeight = rowPx === 36 ? 14 : 28;
  const gap = rowPx === 36 ? 2 : 4;
  const height = Math.max(minHeight, (block.dur / 60) * rowPx - gap);
  const tiny = height < 28;

  const endMin = block.start + block.dur;

  return (
    <div
      className={`block ${block.color}${tiny ? " tiny" : ""}`}
      style={{
        top,
        height,
        outline: selected ? "2px solid var(--fl-text)" : "none",
        outlineOffset: "1px",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(block, e.currentTarget as HTMLDivElement);
      }}
    >
      <div className="b-title">{block.title}</div>
      {!tiny && (
        <div className="b-meta">
          {fmtHM(block.start * 60)}–{fmtHM(endMin * 60)} · {block.dur}m
        </div>
      )}
    </div>
  );
}
