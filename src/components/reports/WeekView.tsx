import { TimelineBlock } from "./TimelineBlock";
import type { TimeEntryBlock } from "@/types/report";

const ROW_PX = 36;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const DAYS_JP = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type Props = {
  blocks: TimeEntryBlock[];
  todayIdx: number;
  nowMin: number;
  weekDates: Date[];
  selected: string | null;
  onSelectBlock: (
    blockId: string,
    block: TimeEntryBlock,
    el: HTMLDivElement,
  ) => void;
};

export function WeekView({
  blocks,
  todayIdx,
  nowMin,
  weekDates,
  selected,
  onSelectBlock,
}: Props) {
  return (
    <div className="week-view">
      {/* 曜日・日付ヘッダー */}
      <div className="week-day-head">
        {weekDates.map((d, i) => {
          const dayBlocks = blocks.filter((b) => b.day === i);
          const totalMin = dayBlocks.reduce((s, b) => s + b.dur, 0);
          const hours = (totalMin / 60).toFixed(1);
          return (
            <div
              key={i}
              className={`week-day${i === todayIdx ? " today" : ""}`}
            >
              <div className="dow">{DAYS_JP[i]}</div>
              <div className="num">{d.getUTCDate()}</div>
              <div className="hrs">{hours}h</div>
            </div>
          );
        })}
      </div>

      {/* 時刻列 */}
      <div className="hours-col">
        {HOURS.map((h) => (
          <div key={h} className="hour-tick" style={{ height: ROW_PX }}>
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {/* グリッド本体 */}
      <div className="grid-area" style={{ minHeight: ROW_PX * 24 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const dayBlocks = blocks.filter((b) => b.day === i);
          return (
            <div key={i} className={`day-col${i === todayIdx ? " today" : ""}`}>
              {dayBlocks.map((block) => (
                <TimelineBlock
                  key={block.id}
                  block={block}
                  rowPx={ROW_PX}
                  selected={selected === block.id}
                  onClick={(b, el) => onSelectBlock(b.id, b, el)}
                />
              ))}
              {i === todayIdx && (
                <div
                  className="now-line"
                  style={{ top: (nowMin / 60) * ROW_PX }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
