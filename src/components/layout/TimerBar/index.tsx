"use client";

import { useEffect, useReducer, useRef, useTransition } from "react";
import { Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimerStore } from "@/stores/timer-store";
import { fmtTime } from "@/lib/format";
import { stopTimer } from "@/lib/actions/timer";
import type { TimerStyle } from "@/types";

const GOAL_SEC = 25 * 60;

export function TimerBar({
  timerStyle = "regular",
  initialActiveTimer = null,
}: {
  timerStyle?: TimerStyle;
  initialActiveTimer?: {
    taskId: string;
    taskTitle: string;
    startedAtMs: number;
  } | null;
}) {
  const { runningTaskId, runningTaskTitle, startedAtMs, getElapsed, stop } =
    useTimerStore();
  const start = useTimerStore((state) => state.start);
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const [isPending, startTransition] = useTransition();
  const hasHydratedInitialTimer = useRef(false);

  useEffect(() => {
    if (!runningTaskId) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [runningTaskId]);

  useEffect(() => {
    if (hasHydratedInitialTimer.current || runningTaskId || !initialActiveTimer) {
      return;
    }
    hasHydratedInitialTimer.current = true;
    start(
      initialActiveTimer.taskId,
      initialActiveTimer.taskTitle,
      initialActiveTimer.startedAtMs,
    );
  }, [initialActiveTimer, runningTaskId, start]);

  const elapsed = runningTaskId ? getElapsed() : 0;

  if (!runningTaskId) return null;

  const progress = `${Math.min(100, ((elapsed % GOAL_SEC) / GOAL_SEC) * 100)}%`;
  const startedStr = startedAtMs
    ? `${String(new Date(startedAtMs).getHours()).padStart(2, "0")}:${String(new Date(startedAtMs).getMinutes()).padStart(2, "0")}`
    : "";

  const isSlim = timerStyle === "slim";
  const isFloating = timerStyle === "floating";

  function handleStop() {
    startTransition(async () => {
      await stopTimer();
      stop();
    });
  }

  return (
    // floating 時はデスクトップのみ外側をスペーサーにし、計測中に grid 行高（80px）を
    // 確保して main がカードの背後に潜らないようにする。非計測時は早期 return null で
    // このスペーサーごと消えるため、レイアウトは従来どおり詰まる。
    <div className={cn(isFloating && "md:relative md:h-[80px]")}>
      <div
        data-testid="timer-bar"
        className={cn(
          "relative flex items-center overflow-hidden border-b bg-panel",
          isSlim
            ? "h-[44px] px-[16px] gap-[12px]"
            : "h-[60px] px-[20px] gap-[16px]",
          // floating はデスクトップ幅のみ。モバイルは通常フローの上部固定バーにフォールバック
          isFloating &&
            "md:absolute md:top-[12px] md:left-[16px] md:right-[24px] md:h-[56px] md:rounded-[12px] md:border md:z-30 md:backdrop-blur-[20px] md:bg-[color-mix(in_oklab,var(--fl-panel)_88%,transparent)] md:shadow-[var(--fl-shadow-lg)]",
        )}
        style={{ borderColor: "var(--fl-border)" }}
      >
        {/* Pulse dot */}
        <span
          className="w-[8px] h-[8px] rounded-full shrink-0"
          style={{
            background: "var(--fl-brand)",
            animation: "timer-pulse 1.6s ease-out infinite",
          }}
        />

        {/* Task info */}
        <div className="flex flex-col min-w-0 flex-1">
          <span
            data-testid="timer-task-name"
            className="text-[14px] font-[500] tracking-[-0.01em] truncate"
            style={{ color: "var(--fl-text)" }}
          >
            {runningTaskTitle || runningTaskId}
          </span>
          <span
            className="flex items-center gap-[8px] font-mono text-[11px] mt-[1px] truncate"
            style={{ color: "var(--fl-text-muted)" }}
          >
            <span>計測中</span>
            {startedStr && (
              <>
                <span style={{ color: "var(--fl-text-subtle)" }}>•</span>
                <span>開始 {startedStr}</span>
              </>
            )}
          </span>
        </div>

        {/* Elapsed */}
        <span
          className={cn(
            "font-mono font-[500] tracking-[-0.02em] tabular-nums shrink-0",
            isSlim ? "text-[16px]" : "text-[22px]",
          )}
          style={{
            color: "var(--fl-brand)",
            textShadow: "0 0 16px var(--fl-brand-glow)",
          }}
        >
          {fmtTime(elapsed)}
        </span>

        {/* Stop button */}
        <button
          onClick={handleStop}
          disabled={isPending}
          className={cn(
            "flex items-center gap-[7px] rounded-[7px] border font-[500] cursor-pointer transition-all duration-[80ms]",
            "hover:bg-[var(--fl-hover)] disabled:opacity-50",
            isSlim
              ? "h-[28px] px-[10px] text-[11.5px]"
              : "h-[34px] px-[12px] text-[12.5px]",
          )}
          style={{
            background: "var(--fl-panel-2)",
            borderColor: "var(--fl-border-strong)",
            color: "var(--fl-text)",
          }}
        >
          <Square size={9} fill="var(--fl-danger)" stroke="none" />
          停止
        </button>

        {/* Progress track */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden"
          style={{ background: "var(--fl-border-subtle)" }}
        >
          <div
            className="h-full relative"
            style={{
              width: progress,
              background:
                "linear-gradient(90deg, var(--fl-brand) 0%, var(--fl-brand-2) 100%)",
              boxShadow: "0 0 12px var(--fl-brand-glow)",
              transition: "width 1s linear",
            }}
          >
            <span
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                animation: "shimmer 2.2s infinite",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
