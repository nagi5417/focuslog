import type { Dispatch, SetStateAction } from "react";
import { useEffect, useReducer, useRef } from "react";
import { useTimerStore } from "@/stores/timer-store";
import type { ActiveTimer } from "@/lib/actions/timer";
import type { Task } from "@/types/task";

/**
 * タイマーの「表示同期」を担うフック。
 * - 計測中は毎秒 tick して経過時間表示を再描画する
 * - 初回マウント時にサーバーのアクティブタイマーを Zustand へ復元する
 * - タイマー停止を検知し、計測秒数を該当タスクの elapsed に加算する（setTasks 経由）
 *
 * tasks の所有は useTaskActions 側にあるため、加算は setTasks を受け取って行う。
 */
export function useTimerSync(
  initialTasks: Task[],
  initialActiveTimer: ActiveTimer | null,
  setTasks: Dispatch<SetStateAction<Task[]>>,
) {
  const { runningTaskId, getElapsed, start } = useTimerStore();
  const lastStopped = useTimerStore((s) => s.lastStopped);
  // マウント時点までに記録済みの停止は適用しない（サーバー初期データに含まれるため）
  const processedStopSeq = useRef<number>(useTimerStore.getState().stopSeq);

  // タイマー表示用の毎秒 tick
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!runningTaskId) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [runningTaskId]);

  // ページロード時にアクティブタイマーを Zustand に復元
  useEffect(() => {
    if (initialActiveTimer && !runningTaskId) {
      const task = initialTasks.find((t) => t.id === initialActiveTimer.taskId);
      start(
        initialActiveTimer.taskId ?? "",
        task?.title ?? "",
        initialActiveTimer.startedAtMs,
      );
    }
    // 初回マウント時のみ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // タイマー停止（または別タスクへの切替）を検知し、計測秒数を該当タスクの
  // elapsed へ加算して即時反映する。TimerBar 停止・行のポーズの両経路をカバーする。
  useEffect(() => {
    if (!lastStopped || lastStopped.seq <= processedStopSeq.current) return;
    processedStopSeq.current = lastStopped.seq;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === lastStopped.taskId
          ? { ...t, elapsed: t.elapsed + lastStopped.seconds }
          : t,
      ),
    );
  }, [lastStopped, setTasks]);

  const liveElapsed = runningTaskId ? getElapsed() : 0;

  return { liveElapsed, runningTaskId };
}
