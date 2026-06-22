export type TimerState = {
  runningTaskId: string | null;
  startedAtMs: number | null;
  accumulated: number;
};

export type TimerStyle = "regular" | "slim" | "floating";
export type Density = "compact" | "regular" | "comfy";
