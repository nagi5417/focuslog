import { fmtShort } from "@/lib/format";
import { TimelineBlock } from "./TimelineBlock";
import type { TimeEntryBlock } from "@/types/report";

const ROW_PX_DAY = 56;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

type Props = {
  blocks: TimeEntryBlock[];
  dayIdx: number;
  nowMin: number;
  selected: string | null;
  onSelectBlock: (
    blockId: string,
    block: TimeEntryBlock,
    el: HTMLDivElement,
  ) => void;
};

export function DayView({
  blocks,
  dayIdx,
  nowMin,
  selected,
  onSelectBlock,
}: Props) {
  const dayBlocks = blocks.filter((b) => b.day === dayIdx);
  const totalSec = dayBlocks.reduce((s, b) => s + b.dur * 60, 0);

  return (
    <div>
      {/* サマリーバー */}
      <div
        style={{
          display: "flex",
          gap: 24,
          padding: "8px 28px 16px",
          color: "var(--fl-text-muted)",
          fontSize: 12,
          fontFamily: '"Geist Mono", ui-monospace, monospace',
        }}
      >
        <span>
          合計{" "}
          <span style={{ color: "var(--fl-text)" }}>{fmtShort(totalSec)}</span>
        </span>
        <span>
          セッション数{" "}
          <span style={{ color: "var(--fl-text)" }}>{dayBlocks.length}</span>
        </span>
      </div>

      {/* タイムライン */}
      <div className="day-view">
        <div className="hours-col">
          {HOURS.map((h) => (
            <div key={h} className="hour-tick" style={{ height: ROW_PX_DAY }}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div className="grid-area" style={{ minHeight: ROW_PX_DAY * 24 }}>
          <div className="day-col">
            {dayBlocks.map((block) => (
              <TimelineBlock
                key={block.id}
                block={block}
                rowPx={ROW_PX_DAY}
                selected={selected === block.id}
                onClick={(b, el) => onSelectBlock(b.id, b, el)}
              />
            ))}
            <div
              className="now-line"
              style={{ top: (nowMin / 60) * ROW_PX_DAY }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
