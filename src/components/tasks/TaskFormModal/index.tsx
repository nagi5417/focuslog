"use client";

import { useState } from "react";
import { createProject, createTag } from "@/lib/actions/classification";
import { createTask, updateTask } from "@/lib/actions/task";
import { jstInputsToIso, toJstDateInput, toJstTimeInput } from "@/lib/jst";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  Priority,
  ProjectSummary,
  TagSummary,
  Task,
  TaskClassificationOptions,
} from "@/types/task";

type CreateProps = {
  mode?: "create";
  onAdd: (task: Task) => void;
};
type EditProps = {
  mode: "edit";
  task: Task;
  onUpdated: (task: Task) => void;
};
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classificationOptions: TaskClassificationOptions;
  onClassificationOptionsChange: (options: TaskClassificationOptions) => void;
} & (CreateProps | EditProps);

// 優先度の数値は createTask 側の閾値（>=3 high / ==2 mid / else low）に整合させる
const PRIORITY_OPTIONS: { value: number; label: string; prio: Priority }[] = [
  { value: 3, label: "高", prio: "high" },
  { value: 2, label: "中", prio: "mid" },
  { value: 0, label: "低", prio: "low" },
];

const DOT_CLASS: Record<Priority, string> = {
  high: "bg-pri-high",
  mid: "bg-pri-mid",
  low: "bg-pri-low",
};

const DEFAULT_PRIORITY = 0;

export function TaskFormModal(props: Props) {
  const {
    open,
    onOpenChange,
    classificationOptions,
    onClassificationOptionsChange,
  } = props;
  const isEdit = props.mode === "edit";
  // 編集時は生値（priority 数値・dueDate の ISO）から初期値を作る。
  // 親は key={task.id} で編集インスタンスをマウントするため初期化子が正しく効く。
  const initialTask = props.mode === "edit" ? props.task : null;

  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [date, setDate] = useState(
    initialTask?.dueDate ? toJstDateInput(initialTask.dueDate) : "",
  );
  const [time, setTime] = useState(
    initialTask?.dueDate ? toJstTimeInput(initialTask.dueDate) : "",
  );
  const [priority, setPriority] = useState<number>(
    initialTask?.priority ?? DEFAULT_PRIORITY,
  );
  const [projectId, setProjectId] = useState<string>(
    initialTask?.project?.id ?? "",
  );
  const [tagIds, setTagIds] = useState<Set<string>>(
    () => new Set(initialTask?.tags.map((tag) => tag.id) ?? []),
  );
  const [newProjectName, setNewProjectName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setDate("");
    setTime("");
    setPriority(DEFAULT_PRIORITY);
    setProjectId("");
    setTagIds(new Set());
    setNewProjectName("");
    setNewTagName("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    // 閉じるときはフォームを初期化（提出中は閉じない）。
    // 編集モードは閉じる＝アンマウント（key 方式）のため初期化しない。
    if (!next && isSubmitting) return;
    if (!next && !isEdit) resetForm();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    // 日付があれば JST 固定で ISO 化（時刻未指定は当日終わり 23:59）。日付が無ければ期限クリア。
    // 素朴な new Date(`${date}T${time}`) はローカル TZ 依存になるため使わない。
    const dueDate = date ? jstInputsToIso(date, time || "23:59") : null;
    const selectedTagIds = [...tagIds];

    setIsSubmitting(true);
    setError(null);
    const result =
      props.mode === "edit"
        ? await updateTask(props.task.id, {
            title: trimmed,
            priority,
            dueDate, // 編集は null で期限クリア（updateTask の nullish Zod が受理）
            projectId: projectId || null,
            tagIds: selectedTagIds,
          })
        : await createTask({
            title: trimmed,
            priority,
            // 作成は null 非対応のため undefined（期限なし）に寄せる
            dueDate: dueDate ?? undefined,
            projectId: projectId || null,
            tagIds: selectedTagIds,
          });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (props.mode === "edit") {
      props.onUpdated(result.data);
    } else {
      props.onAdd(result.data);
      resetForm();
    }
    onOpenChange(false);
  }

  function toggleTag(id: string) {
    setTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name || isCreatingProject) return;
    setIsCreatingProject(true);
    setError(null);
    const result = await createProject({ name });
    setIsCreatingProject(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const nextProjects = upsertById(classificationOptions.projects, result.data);
    onClassificationOptionsChange({
      ...classificationOptions,
      projects: nextProjects,
    });
    setProjectId(result.data.id);
    setNewProjectName("");
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name || isCreatingTag) return;
    setIsCreatingTag(true);
    setError(null);
    const result = await createTag({ name });
    setIsCreatingTag(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const nextTags = upsertById(classificationOptions.tags, result.data);
    onClassificationOptionsChange({
      ...classificationOptions,
      tags: nextTags,
    });
    setTagIds((prev) => new Set(prev).add(result.data.id));
    setNewTagName("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "タスクを編集" : "新規タスク"}</DialogTitle>
          <DialogDescription>
            タイトルは必須です。期限と優先度は任意で設定できます。
          </DialogDescription>
        </DialogHeader>

        <form
          id="task-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          {/* タイトル */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">タイトル</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={(e) => {
                // 編集時は既存タイトルを全選択して上書きしやすくする
                if (isEdit) e.target.select();
              }}
              placeholder="タスク名を入力"
              maxLength={200}
              autoFocus
              disabled={isSubmitting}
              aria-invalid={Boolean(error)}
            />
          </div>

          {/* 期限（日付 + 時刻を別フィールド） */}
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="task-date">期限日</Label>
              <Input
                id="task-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="task-time">時刻（任意）</Label>
              <Input
                id="task-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isSubmitting || !date}
              />
            </div>
          </div>

          {/* 優先度 */}
          <div className="flex flex-col gap-1.5">
            <Label>優先度</Label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => {
                const active = priority === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    disabled={isSubmitting}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 h-8 rounded-lg border text-sm font-medium transition-colors cursor-pointer disabled:opacity-50",
                      active
                        ? "border-[var(--fl-brand)] bg-[var(--fl-brand-ghost)] text-[var(--fl-text)]"
                        : "border-border text-[var(--fl-text-muted)] hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        DOT_CLASS[opt.prio],
                      )}
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* プロジェクト */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-project">プロジェクト</Label>
            <select
              id="task-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={isSubmitting}
              className="h-9 rounded-md border border-[var(--fl-border)] bg-transparent px-3 text-sm text-[var(--fl-text)] outline-none focus:border-[var(--fl-brand)]"
            >
              <option value="">プロジェクトなし</option>
              {classificationOptions.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="新しいプロジェクト"
                disabled={isSubmitting || isCreatingProject}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || isCreatingProject}
              >
                作成
              </Button>
            </div>
          </div>

          {/* タグ */}
          <div className="flex flex-col gap-1.5">
            <Label>タグ</Label>
            <div className="flex flex-wrap gap-2">
              {classificationOptions.tags.length === 0 ? (
                <span className="text-xs text-[var(--fl-text-subtle)]">
                  タグはまだありません
                </span>
              ) : (
                classificationOptions.tags.map((tag) => {
                  const active = tagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      aria-pressed={active}
                      disabled={isSubmitting}
                      className={cn(
                        "h-7 rounded-[5px] border px-2 font-mono text-[11px] transition-colors disabled:opacity-50",
                        active
                          ? "border-[var(--fl-brand)] bg-[var(--fl-brand-ghost)] text-[var(--fl-brand)]"
                          : "border-[var(--fl-border)] text-[var(--fl-text-muted)] hover:bg-[var(--fl-hover)]",
                      )}
                    >
                      #{tag.name}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="新しいタグ"
                disabled={isSubmitting || isCreatingTag}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || isCreatingTag}
              >
                作成
              </Button>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <p className="text-sm text-[var(--fl-danger)]" role="alert">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            form="task-form"
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting
              ? isEdit
                ? "更新中…"
                : "追加中…"
              : isEdit
                ? "更新"
                : "追加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function upsertById<T extends ProjectSummary | TagSummary>(
  items: T[],
  item: T,
): T[] {
  const exists = items.some((current) => current.id === item.id);
  const next = exists
    ? items.map((current) => (current.id === item.id ? item : current))
    : [...items, item];
  return [...next].sort((a, b) => a.name.localeCompare(b.name, "ja"));
}
