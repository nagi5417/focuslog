"use client";

import { useTransition } from "react";
import { Play, Pause, Clock, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/lib/format";
import { useTimerStore } from "@/stores/timer-store";
import { startTimer } from "@/lib/actions/timer";
import {
  formatDue,
  isDone,
  isOverdue,
  toPriorityLabel,
} from "@/lib/task-transform";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import type { Task } from "@/types/task";

type Props = {
  task: Task;
  liveElapsed: number;
  nowMs: number;
  onToggleDone: (id: string) => void;
  onEdit: (task: Task) => void;
  onRequestDelete: (task: Task) => void;
};

export function TaskRow({
  task,
  liveElapsed,
  nowMs,
  onToggleDone,
  onEdit,
  onRequestDelete,
}: Props) {
  const { runningTaskId, start, stop } = useTimerStore();
  const isRunning = task.id === runningTaskId;
  const [isPending, startTransition] = useTransition();

  const elapsed = isRunning ? liveElapsed : task.elapsed;

  // 生値から表示ラベルを算出（"今" はサーバー確定の nowMs を使用）
  const done = isDone(task.status);
  const prio = toPriorityLabel(task.priority);
  const dueLabel = formatDue(task.dueDate, nowMs);
  const overdue = isOverdue(task.dueDate, done, nowMs);

  function handleToggleTimer() {
    if (isRunning) {
      // TimerBar の停止ボタンと同じフロー（停止記録は timer-store.stop が担う）
      startTransition(async () => {
        const { stopTimer } = await import("@/lib/actions/timer");
        await stopTimer();
        stop();
      });
    } else {
      startTransition(async () => {
        const result = await startTimer(task.id);
        if (result.ok) {
          start(task.id, task.title, result.data.startedAtMs);
        }
      });
    }
  }

  return (
    <div
      data-testid="task-row"
      data-task-id={task.id}
      data-overdue={overdue}
      className={cn(
        "group grid items-center gap-x-2 px-3 py-[7px] rounded-[6px] transition-all duration-[80ms]",
        "hover:bg-[var(--fl-hover)]",
        isRunning && [
          "border-l-2 border-[var(--fl-brand)]",
          "bg-gradient-to-r from-[var(--fl-brand-ghost)] to-transparent",
        ],
        done && "opacity-60",
      )}
      style={{
        gridTemplateColumns: "32px 32px minmax(0,1fr) auto auto auto auto auto",
      }}
    >
      {/* 再生 / 停止ボタン */}
      <button
        data-testid="timer-toggle"
        onClick={handleToggleTimer}
        disabled={isPending}
        title={isRunning ? "停止" : "計測開始"}
        className={cn(
          "flex items-center justify-center w-[22px] h-[22px] rounded-[5px] border",
          "transition-all duration-[80ms] cursor-pointer shadow-[0_0_0_0_var(--fl-brand-glow)]",
          isRunning
            ? "border-[var(--fl-brand)] bg-[var(--fl-brand)] text-[var(--fl-on-brand)] shadow-[0_0_0_3px_var(--fl-brand-ghost)]"
            : "border-[var(--fl-brand)] bg-transparent text-[var(--fl-brand)] hover:bg-[var(--fl-brand-ghost)] hover:shadow-[0_0_0_3px_var(--fl-brand-ghost)]",
          "disabled:opacity-50",
        )}
      >
        {isRunning ? <Pause size={9} /> : <Play size={9} />}
      </button>

      {/* チェックボックス */}
      <button
        onClick={() => onToggleDone(task.id)}
        className={cn(
          "flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border transition-all duration-[80ms] cursor-pointer",
          done
            ? "bg-[var(--fl-brand)] border-[var(--fl-brand)]"
            : "border-[var(--fl-border-strong)] hover:border-[var(--fl-brand)]",
        )}
      >
        {done && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className="text-[var(--fl-on-brand)]"
          >
            <path
              d="M2 5l2.5 2.5L8 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* タイトル */}
      <span
        className={cn(
          "text-[13.5px] font-[450] tracking-[-0.005em] truncate",
          done
            ? "line-through text-[var(--fl-text-subtle)]"
            : "text-[var(--fl-text)]",
        )}
      >
        {task.title}
      </span>

      {/* 分類バッジ */}
      <div className="hidden max-w-[220px] items-center gap-1 overflow-hidden lg:flex">
        {task.project && (
          <span className="truncate rounded-[4px] border border-[var(--fl-border)] bg-[var(--fl-panel-2)] px-1.5 py-0.5 text-[10.5px] text-[var(--fl-text-muted)]">
            {task.project.name}
          </span>
        )}
        {task.tags.slice(0, 2).map((tag) => (
          <span
            key={tag.id}
            className="truncate rounded-[4px] border border-[var(--fl-border)] bg-[var(--fl-panel-2)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--fl-text-muted)]"
          >
            #{tag.name}
          </span>
        ))}
        {task.tags.length > 2 && (
          <span className="font-mono text-[10.5px] text-[var(--fl-text-subtle)]">
            +{task.tags.length - 2}
          </span>
        )}
      </div>

      {/* 優先度バッジ */}
      <PriorityBadge prio={prio} />

      {/* 期限（期限切れは赤で強調） */}
      {dueLabel ? (
        <div
          className={cn(
            "flex items-center gap-1 font-mono text-[11.5px]",
            overdue
              ? "text-[var(--fl-danger)] font-[500]"
              : dueLabel === "今日" || dueLabel === "明日"
                ? "text-[var(--fl-text-muted)]"
                : "text-[var(--fl-text-subtle)]",
          )}
        >
          <Clock size={11} />
          <span>{dueLabel}</span>
        </div>
      ) : (
        <span />
      )}

      {/* 経過時間（時:分:秒） */}
      <span
        data-testid="task-elapsed"
        className={cn(
          "font-mono text-[11.5px] tabular-nums min-w-[60px] text-right",
          isRunning ? "text-[var(--fl-brand)]" : "text-[var(--fl-text-subtle)]",
        )}
      >
        {elapsed > 0 ? fmtTime(elapsed) : "–"}
      </span>

      {/* 編集・削除（ホバー/フォーカスで表示。タッチ端末では常時表示） */}
      <div className="flex items-center gap-0.5 pl-1 transition-opacity duration-[80ms] can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100">
        <button
          type="button"
          data-testid="task-edit"
          onClick={() => onEdit(task)}
          aria-label={`「${task.title}」を編集`}
          className="flex items-center justify-center w-[24px] h-[24px] rounded-[5px] text-[var(--fl-text-muted)] hover:text-[var(--fl-text)] hover:bg-[var(--fl-hover)] cursor-pointer transition-colors duration-[80ms]"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          data-testid="task-delete"
          onClick={() => onRequestDelete(task)}
          aria-label={`「${task.title}」を削除`}
          className="flex items-center justify-center w-[24px] h-[24px] rounded-[5px] text-[var(--fl-text-muted)] hover:text-[var(--fl-danger)] hover:bg-[var(--fl-hover)] cursor-pointer transition-colors duration-[80ms]"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
