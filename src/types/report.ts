export type BlockColor =
  | "c-emerald"
  | "c-blue"
  | "c-violet"
  | "c-orange"
  | "c-rose"
  | "c-cyan"
  | "c-amber"
  | "c-slate";

export type WeekBlock = {
  day: number;
  start: number;
  dur: number;
  title: string;
  tag: string;
  color: BlockColor;
};

export type TimeEntryBlock = WeekBlock & {
  id: string;
  taskId: string | null;
  startedAtMs: number;
  endedAtMs: number;
};
