"use client";

import { useEffect, useRef, useState } from "react";
import { Filter, Search, Plus, X } from "lucide-react";
import {
  groupBySection,
  isDone,
  toDueBucket,
  toPriorityLabel,
} from "@/lib/task-transform";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useTimerSync } from "@/hooks/useTimerSync";
import { useTodayTrackedSec } from "@/hooks/useTodayTrackedSec";
import { useTaskPageUiStore } from "@/stores/task-page-ui-store";
import { fmtDate, fmtShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/tasks/SectionCard";
import { TaskSectionList } from "@/components/tasks/TaskSectionList";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type {
  Priority,
  Section,
  Task,
  TaskClassificationOptions,
} from "@/types/task";
import type { ActiveTimer } from "@/lib/actions/timer";

type Props = {
  initialTasks: Task[];
  initialActiveTimer: ActiveTimer | null;
  initialClassificationOptions: TaskClassificationOptions;
  // 今日開始・停止済みの計測時間（秒）。サーバーで集計した値
  initialTodayTrackedSec: number;
  nowMs: number;
};

// 表示順と既定の開閉。期限切れ・今日だけを開いておき、残りは折りたたむ
const SECTIONS: { key: Section; title: string; defaultOpen: boolean }[] = [
  { key: "overdue", title: "期限切れ", defaultOpen: true },
  { key: "today", title: "今日のタスク", defaultOpen: true },
  { key: "upcoming", title: "今後のタスク", defaultOpen: false },
  { key: "undated", title: "日付未設定のタスク", defaultOpen: false },
  { key: "done", title: "完了したタスク", defaultOpen: false },
];

const PRIORITY_FILTERS: { prio: Priority; label: string; dot: string }[] = [
  { prio: "high", label: "高", dot: "bg-pri-high" },
  { prio: "mid", label: "中", dot: "bg-pri-mid" },
  { prio: "low", label: "低", dot: "bg-pri-low" },
];

export function TasksPageClient({
  initialTasks,
  initialActiveTimer,
  initialClassificationOptions,
  initialTodayTrackedSec,
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
  // 作成モーダルと検索欄の開閉はストアで持つ（他画面の N / ⌘K からも開けるようにするため）
  const isModalOpen = useTaskPageUiStore((s) => s.isCreateOpen);
  const setIsModalOpen = useTaskPageUiStore((s) => s.setCreateOpen);
  const searchOpen = useTaskPageUiStore((s) => s.isSearchOpen);
  const setSearchOpen = useTaskPageUiStore((s) => s.setSearchOpen);
  const [query, setQuery] = useState("");
  const [classificationOptions, setClassificationOptions] = useState(
    initialClassificationOptions,
  );
  const [projectFilter, setProjectFilter] = useState("");
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(
    new Set(),
  );
  const searchRef = useRef<HTMLInputElement>(null);

  // タイマーの表示同期（毎秒 tick・初期復元・停止時の elapsed 加算）はフックに集約
  const { liveElapsed } = useTimerSync(
    initialTasks,
    initialActiveTimer,
    setTasks,
  );
  // ヘッダーの「計測」は今日実際に計測した時間（タスクの累計時間ではない）
  const todayTrackedSec = useTodayTrackedSec(initialTodayTrackedSec, nowMs);

  // 検索欄が開いたら入力欄にフォーカスする。⌘K は KeyboardShortcuts が全画面で受け付け、
  // ストア経由でここを開く（他画面から遷移してきた場合も同じ経路で開く）
  useEffect(() => {
    if (!searchOpen) return;
    // 検索欄の描画を待ってからフォーカスする
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [searchOpen]);


  // 検索（タイトル部分一致）と優先度フィルタの AND 条件で絞り込み
  const matches = (t: Task) => {
    const q = query.trim().toLowerCase();
    const byQuery = !q || t.title.toLowerCase().includes(q);
    const byPriority =
      priorityFilter.size === 0 ||
      priorityFilter.has(toPriorityLabel(t.priority));
    const byProject = !projectFilter || t.project?.id === projectFilter;
    const byTags =
      tagFilter.size === 0 || t.tags.some((tag) => tagFilter.has(tag.id));
    return byQuery && byPriority && byProject && byTags;
  };

  // 検索・フィルタを適用してから5セクションへ振り分ける（各セクション内の並び替えも済む）
  const sections = groupBySection(tasks.filter(matches), nowMs);

  const activeFilterCount =
    priorityFilter.size + tagFilter.size + (projectFilter ? 1 : 0);
  const isNarrowed = activeFilterCount > 0 || query.trim() !== "";
  const emptyLabel = isNarrowed
    ? "条件に一致するタスクがありません"
    : "タスクはありません";

  // ヘッダー統計は絞り込み前の全タスクを、完了状態を見ない toDueBucket で数える
  const dueToday = tasks.filter(
    (t) => toDueBucket(t.dueDate, nowMs) === "today",
  );
  const overdueCount = tasks.filter(
    (t) => toDueBucket(t.dueDate, nowMs) === "overdue" && !isDone(t.status),
  ).length;
  const doneCount = dueToday.filter((t) => isDone(t.status)).length;
  const completionPct = dueToday.length
    ? Math.round((doneCount / dueToday.length) * 100)
    : 0;

  const dateStr = fmtDate(new Date(nowMs));

  function togglePriority(prio: Priority) {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(prio)) next.delete(prio);
      else next.add(prio);
      return next;
    });
  }

  function toggleTagFilter(id: string) {
    setTagFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setPriorityFilter(new Set());
    setProjectFilter("");
    setTagFilter(new Set());
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ページヘッダー */}
      <div
        className="flex flex-col gap-3 px-4 pt-4 pb-3 border-b shrink-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:pt-5 sm:pb-4"
        style={{ borderColor: "var(--fl-border)" }}
      >
        <div className="min-w-0">
          <h1 className="flex items-baseline gap-2 text-[18px] font-[600] tracking-[-0.02em] text-[var(--fl-text)]">
            タスク
            <span className="text-[12px] font-[400] text-[var(--fl-text-subtle)] tracking-normal">
              {dateStr}
            </span>
          </h1>
          <p className="mt-0.5 flex flex-wrap gap-x-1 text-[12px] text-[var(--fl-text-muted)] font-mono">
            <span>今日 {dueToday.length}件</span>
            <span>/ 期限切れ {overdueCount}件</span>
            <span>
              / 完了 {doneCount}件 ({completionPct}%)
            </span>
            <span>· 計測 {fmtShort(todayTrackedSec)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 sm:mt-0.5">
          {/* 優先度フィルタ */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                data-testid="task-filter-open"
                className={cn(
                  "flex shrink-0 items-center gap-1.5 h-[30px] px-3 rounded-[7px] border text-[12px] font-[500] transition-colors duration-[80ms] cursor-pointer hover:bg-[var(--fl-hover)]",
                  activeFilterCount > 0
                    ? "text-[var(--fl-text)] border-[var(--fl-brand)]"
                    : "text-[var(--fl-text-muted)]",
                )}
                style={
                  activeFilterCount > 0
                    ? undefined
                    : { borderColor: "var(--fl-border)" }
                }
              >
                <Filter size={13} />
                フィルタ
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-full bg-[var(--fl-brand)] text-[var(--fl-on-brand)] font-mono text-[9px]">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-[500] text-[var(--fl-text)]">
                  絞り込み
                </span>
                {(priorityFilter.size > 0 ||
                  projectFilter ||
                  tagFilter.size > 0) && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-[var(--fl-text-muted)] hover:text-[var(--fl-text)] cursor-pointer"
                  >
                    クリア
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <span className="text-[11px] text-[var(--fl-text-subtle)]">
                  プロジェクト
                </span>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="h-8 rounded-md border border-[var(--fl-border)] bg-transparent px-2 text-[12px] text-[var(--fl-text)] outline-none"
                >
                  <option value="">すべて</option>
                  {classificationOptions.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <span className="text-[11px] text-[var(--fl-text-subtle)]">
                  優先度
                </span>
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
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <span className="text-[11px] text-[var(--fl-text-subtle)]">
                  タグ
                </span>
                {classificationOptions.tags.length === 0 ? (
                  <span className="text-[11px] text-[var(--fl-text-subtle)]">
                    タグはまだありません
                  </span>
                ) : (
                  classificationOptions.tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 py-1 cursor-pointer text-[13px] text-[var(--fl-text)]"
                    >
                      <Checkbox
                        checked={tagFilter.has(tag.id)}
                        onCheckedChange={() => toggleTagFilter(tag.id)}
                      />
                      #{tag.name}
                    </label>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* 検索 */}
          {searchOpen ? (
            <div
              className="flex flex-1 min-w-0 items-center gap-1.5 h-[30px] px-2.5 rounded-[7px] border sm:flex-none"
              style={{ borderColor: "var(--fl-border)" }}
            >
              <Search
                size={13}
                className="shrink-0 text-[var(--fl-text-subtle)]"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                placeholder="タイトルで検索…"
                className="w-full min-w-0 bg-transparent text-[12px] text-[var(--fl-text)] placeholder:text-[var(--fl-text-subtle)] outline-none sm:w-[160px]"
              />
              <button
                onClick={closeSearch}
                className="shrink-0 text-[var(--fl-text-subtle)] hover:text-[var(--fl-text)] cursor-pointer"
                aria-label="検索を閉じる"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              data-testid="task-search-open"
              onClick={() => setSearchOpen(true)}
              className="flex shrink-0 items-center gap-1.5 h-[30px] px-3 rounded-[7px] border text-[12px] font-[500] text-[var(--fl-text-muted)] hover:bg-[var(--fl-hover)] transition-colors duration-[80ms] cursor-pointer"
              style={{ borderColor: "var(--fl-border)" }}
            >
              <Search size={13} />
              検索
              <kbd className="ml-0.5 hidden sm:inline-flex items-center justify-center h-[16px] px-1 rounded-[3px] border border-[var(--fl-border-strong)] font-mono text-[9px] text-[var(--fl-text-subtle)]">
                ⌘K
              </kbd>
            </button>
          )}

          {/* 新規タスク */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex shrink-0 items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px] font-[500] cursor-pointer transition-colors duration-[80ms]"
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
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 sm:px-6"
      >
        {SECTIONS.map(({ key, title, defaultOpen }) => {
          // 期限切れは平常時に0件なら描画しない（通常状態でノイズを増やさない）
          if (key === "overdue" && sections.overdue.length === 0 && !isNarrowed) {
            return null;
          }
          return (
            <SectionCard
              key={key}
              title={title}
              count={sections[key].length}
              defaultOpen={defaultOpen}
            >
              <TaskSectionList
                tasks={sections[key]}
                liveElapsed={liveElapsed}
                nowMs={nowMs}
                emptyLabel={emptyLabel}
                onToggleDone={handleToggleDone}
                onEdit={setEditingTask}
                onRequestDelete={setDeletingTask}
              />
            </SectionCard>
          );
        })}

        <div className="h-6" />
      </div>

      <TaskFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onAdd={handleAddTask}
        classificationOptions={classificationOptions}
        onClassificationOptionsChange={setClassificationOptions}
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
          classificationOptions={classificationOptions}
          onClassificationOptionsChange={setClassificationOptions}
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
