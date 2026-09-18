"use client";

import { AnimatePresence, motion } from "motion/react";

import { TaskRow } from "@/components/tasks/TaskRow";
import type { Task } from "@/types/task";

/**
 * セクション内のタスク行リスト。
 * 各セクション（期限切れ / 今日 / 今後 / 日付未設定 / 完了）で同じ描画をするため切り出している。
 * 0件のときは空状態のテキストを出す（検索・フィルタ中は呼び出し側が文言を変える）。
 */

type Props = {
  tasks: Task[];
  liveElapsed: number;
  nowMs: number;
  emptyLabel: string;
  onToggleDone: (id: string) => void;
  onEdit: (task: Task) => void;
  onRequestDelete: (task: Task) => void;
};

const TRANSITION = { duration: 0.42, ease: [0.2, 0.85, 0.2, 1] as const };

export function TaskSectionList({
  tasks,
  liveElapsed,
  nowMs,
  emptyLabel,
  onToggleDone,
  onEdit,
  onRequestDelete,
}: Props) {
  if (tasks.length === 0) {
    return (
      <p className="px-4 py-3 text-[12px] text-[var(--fl-text-subtle)]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <AnimatePresence initial={false}>
      {tasks.map((task) => (
        <motion.div
          key={task.id}
          layout
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={TRANSITION}
        >
          <TaskRow
            task={task}
            liveElapsed={liveElapsed}
            nowMs={nowMs}
            onToggleDone={onToggleDone}
            onEdit={onEdit}
            onRequestDelete={onRequestDelete}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
