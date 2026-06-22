"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Filter, Search, Plus, X } from "lucide-react";
import { isDone, toPriorityLabel, toSection } from "@/lib/task-transform";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useTimerSync } from "@/hooks/useTimerSync";
import { fmtDate, fmtShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/tasks/SectionCard";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Priority, Task } from "@/types/task";
import type { ActiveTimer } from "@/lib/actions/timer";

type Props = {
  initialTasks: Task[];
  initialActiveTimer: ActiveTimer | null;
  nowMs: number;
};

const TRANSITION = { duration: 0.42, ease: [0.2, 0.85, 0.2, 1] as const };

const PRIORITY_FILTERS: { prio: Priority; label: string; dot: string }[] = [
  { prio: "high", label: "高", dot: "bg-pri-high" },
  { prio: "mid", label: "中", dot: "bg-pri-mid" },
  { prio: "low", label: "低", dot: "bg-pri-low" },
];

export function TasksPageClient({
  initialTasks,
  initialActiveTimer,
  nowMs,
}: Props) {
  const {
    tasks,
    setTasks,
    editingTask,
    setEditingTask,
    deletingTask,
    setDeletingTask,
    handleToggleDone,
    handleAddTask,
    handleUpdated,
    handleDelete,
  } = useTaskActions(initialTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(
    new Set(),
  );
  const searchRef = useRef<HTMLInputElement>(null);

  // タイマーの表示同期（毎秒 tick・初期復元・停止時の elapsed 加算）はフックに集約
  const { liveElapsed, runningTaskId } = useTimerSync(
    initialTasks,
    initialActiveTimer,
    setTasks,
  );

  // ⌘K / Ctrl+K で検索を開いてフォーカス
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        // 表示反映後にフォーカス
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 検索（タイトル部分一致）と優先度フィルタの AND 条件で絞り込み
  const matches = (t: Task) => {
    const q = query.trim().toLowerCase();
    const byQuery = !q || t.title.toLowerCase().includes(q);
    const byPriority =
      priorityFilter.size === 0 ||
      priorityFilter.has(toPriorityLabel(t.priority));
    return byQuery && byPriority;
  };

  // today / other に分けて done 順でソート
  const sorted = (arr: Task[]) =>
    [...arr].sort(
      (a, b) => Number(isDone(a.status)) - Number(isDone(b.status)),
    );
  const today = sorted(
    tasks.filter((t) => toSection(t.dueDate, nowMs) === "today" && matches(t)),
  );
  const other = sorted(
    tasks.filter((t) => toSection(t.dueDate, nowMs) === "other" && matches(t)),
  );

  // ヘッダー統計は絞り込み前の「今日」全体を対象にする
  const allToday = tasks.filter((t) => toSection(t.dueDate, nowMs) === "today");
  const doneCount = allToday.filter((t) => isDone(t.status)).length;
  const completionPct = allToday.length
    ? Math.round((doneCount / allToday.length) * 100)
    : 0;
  const totalElapsed = allToday.reduce(
    (s, t) => s + (t.id === runningTaskId ? liveElapsed : t.elapsed),
    0,
  );

  const dateStr = fmtDate(new Date(nowMs));

  function togglePriority(prio: Priority) {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(prio)) next.delete(prio);
      else next.add(prio);
      return next;
    });
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ページヘッダー */}
      <div
        className="flex items-start justify-between px-6 pt-5 pb-4 border-b shrink-0"
        style={{ borderColor: "var(--fl-border)" }}
      >
        <div>
          <h1 className="flex items-baseline gap-2 text-[18px] font-[600] tracking-[-0.02em] text-[var(--fl-text)]">
            タスク
            <span className="text-[12px] font-[400] text-[var(--fl-text-subtle)] tracking-normal">
              {dateStr}
            </span>
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--fl-text-muted)] font-mono">
            今日 {allToday.length}件 / 完了 {doneCount}件 ({completionPct}%) ·
            計測 {fmtShort(totalElapsed)}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {/* 優先度フィルタ */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] border text-[12px] font-[500] transition-colors duration-[80ms] cursor-pointer hover:bg-[var(--fl-hover)]",
                  priorityFilter.size > 0
                    ? "text-[var(--fl-text)] border-[var(--fl-brand)]"
                    : "text-[var(--fl-text-muted)]",
                )}
                style={
                  priorityFilter.size > 0
                    ? undefined
                    : { borderColor: "var(--fl-border)" }
                }
              >
                <Filter size={13} />
                フィルタ
                {priorityFilter.size > 0 && (
                  <span className="inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-full bg-[var(--fl-brand)] text-[var(--fl-on-brand)] font-mono text-[9px]">
                    {priorityFilter.size}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-[500] text-[var(--fl-text)]">
                  優先度で絞り込み
                </span>
                {priorityFilter.size > 0 && (
                  <button
                    onClick={() => setPriorityFilter(new Set())}
                    className="text-[11px] text-[var(--fl-text-muted)] hover:text-[var(--fl-text)] cursor-pointer"
                  >
                    クリア
                  </button>
                )}
              </div>
              {PRIORITY_FILTERS.map(({ prio, label, dot }) => (
                <label
                  key={prio}
                  className="flex items-center gap-2 py-1 cursor-pointer text-[13px] text-[var(--fl-text)]"
                >
                  <Checkbox
                    checked={priorityFilter.has(prio)}
                    onCheckedChange={() => togglePriority(prio)}
                  />
                  <span className={cn("size-1.5 rounded-full", dot)} />
                  {label}
                </label>
              ))}
            </PopoverContent>
          </Popover>

          {/* 検索 */}
          {searchOpen ? (
            <div
              className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-[7px] border"
              style={{ borderColor: "var(--fl-border)" }}
            >
              <Search size={13} className="text-[var(--fl-text-subtle)]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                placeholder="タイトルで検索…"
                className="w-[160px] bg-transparent text-[12px] text-[var(--fl-text)] placeholder:text-[var(--fl-text-subtle)] outline-none"
              />
              <button
                onClick={closeSearch}
                className="text-[var(--fl-text-subtle)] hover:text-[var(--fl-text)] cursor-pointer"
                aria-label="検索を閉じる"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setSearchOpen(true);
                requestAnimationFrame(() => searchRef.current?.focus());
              }}
              className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] border text-[12px] font-[500] text-[var(--fl-text-muted)] hover:bg-[var(--fl-hover)] transition-colors duration-[80ms] cursor-pointer"
              style={{ borderColor: "var(--fl-border)" }}
            >
              <Search size={13} />
              検索
              <kbd className="ml-0.5 inline-flex items-center justify-center h-[16px] px-1 rounded-[3px] border border-[var(--fl-border-strong)] font-mono text-[9px] text-[var(--fl-text-subtle)]">
                ⌘K
              </kbd>
            </button>
          )}

          {/* 新規タスク */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px] font-[500] cursor-pointer transition-colors duration-[80ms]"
            style={{
              background: "var(--fl-brand)",
              color: "var(--fl-on-brand)",
            }}
          >
            <Plus size={13} />
            新規タスク
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div
        data-testid="tasks-scroll-container"
        className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
      >
        {/* 今日のタスク */}
        <SectionCard title="今日のタスク" count={today.length} defaultOpen>
          <AnimatePresence initial={false}>
            {today.map((task) => (
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
                  onToggleDone={handleToggleDone}
                  onEdit={setEditingTask}
                  onRequestDelete={setDeletingTask}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SectionCard>

        {/* その他のタスク */}
        <SectionCard
          title="その他のタスク"
          count={other.length}
          defaultOpen={false}
        >
          <AnimatePresence initial={false}>
            {other.map((task) => (
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
                  onToggleDone={handleToggleDone}
                  onEdit={setEditingTask}
                  onRequestDelete={setDeletingTask}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SectionCard>

        <div className="h-6" />
      </div>

      <TaskFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onAdd={handleAddTask}
      />

      {/* 編集モーダル（開いている間だけマウントし、key で初期値を確実に反映） */}
      {editingTask && (
        <TaskFormModal
          key={editingTask.id}
          mode="edit"
          task={editingTask}
          open
          onOpenChange={(next) => {
            if (!next) setEditingTask(null);
          }}
          onUpdated={handleUpdated}
        />
      )}

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={deletingTask !== null}
        onOpenChange={(next) => {
          if (!next) setDeletingTask(null);
        }}
        title="タスクを削除しますか？"
        description={
          deletingTask
            ? `「${deletingTask.title}」を削除します。この操作は取り消せません。`
            : undefined
        }
        confirmLabel="削除"
        variant="destructive"
        onConfirm={() => {
          if (deletingTask) return handleDelete(deletingTask);
        }}
      />
    </div>
  );
}
