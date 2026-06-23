export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type {
  Priority,
  ProjectSummary,
  Section,
  Tag,
  TagSummary,
  Task,
  TaskClassificationOptions,
} from "./task";
export type {
  BlockColor,
  ReportBreakdownItem,
  ReportPeriod,
  ReportSeriesPoint,
  ReportSummary,
  WeekBlock,
} from "./report";
export type { TimerState, TimerStyle, Density } from "./timer";
