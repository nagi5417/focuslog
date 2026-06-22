export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type { Priority, Section, Tag, Task } from "./task";
export type { BlockColor, WeekBlock } from "./report";
export type { TimerState, TimerStyle, Density } from "./timer";
