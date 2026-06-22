import { useState } from "react";
import { toast } from "sonner";
import { deleteTask, toggleTaskDone } from "@/lib/actions/task";
import { isDone } from "@/lib/task-transform";
import { useTimerStore } from "@/stores/timer-store";
import type { Task } from "@/types/task";

/**
 * タスク一覧の CRUD 状態とハンドラを集約するフック。
 * 表示（フィルタ・検索・レイアウト・タイマー同期）は TasksPageClient に残し、
 * ここでは tasks / 編集対象 / 削除対象の state と楽観的更新ロジックだけを扱う。
 */
export function useTaskActions(initialTasks: Task[]) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const { runningTaskId, stop } = useTimerStore();

  async function handleToggleDone(id: string) {
    // status を TODO ⇄ DONE でトグル（2 回適用すると元に戻るのでロールバックにも使える）
    const toggle = (t: Task): Task =>
      t.id === id ? { ...t, status: isDone(t.status) ? "TODO" : "DONE" } : t;
    // 楽観的更新
    setTasks((prev) => prev.map(toggle));
    const result = await toggleTaskDone(id);
    if (!result.ok) {
      // ロールバック
      setTasks((prev) => prev.map(toggle));
    }
  }

  function handleAddTask(task: Task) {
    setTasks((prev) => [task, ...prev]);
  }

  function handleUpdated(updated: Task) {
    // 期限変更による today/other の振り分けは再レンダリングで自動反映される
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDelete(task: Task) {
    const snapshot = tasks;
    // 楽観的にリストから除去
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    // 計測中タスクを消すならタイマーも止める（Zustand のゴースト表示を防ぐ）
    if (runningTaskId === task.id) stop();
    const result = await deleteTask(task.id);
    if (!result.ok) {
      setTasks(snapshot); // ロールバック
      toast.error(result.error);
      throw new Error(result.error); // ConfirmDialog を開いたまま保持する
    }
    toast.success("タスクを削除しました");
  }

  return {
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
  };
}
