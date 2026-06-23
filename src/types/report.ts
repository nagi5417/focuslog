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

export type ReportPeriod = "week" | "month";

export type ReportSeriesPoint = {
  label: string;
  seconds: number;
};

export type ReportBreakdownItem = {
  id: string | null;
  name: string;
  seconds: number;
  color: string | null;
};

export type ReportSummary = {
  period: ReportPeriod;
  rangeLabel: string;
  totalSec: number;
  averageSec: number;
  sessionCount: number;
  series: ReportSeriesPoint[];
  projects: ReportBreakdownItem[];
  tags: ReportBreakdownItem[];
};
