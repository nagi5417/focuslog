import { useEffect, useState } from "react";
import { isStartedToday } from "@/lib/task-transform";
import { useTimerStore } from "@/stores/timer-store";

/**
 * タスク画面ヘッダーに出す「今日の計測時間（秒）」を返すフック。
 *
 * - 停止済みの計測: サーバーで集計した値（initialSec）に、このページで停止した今日開始分を足す
 * - 計測中のタイマー: 開始が今日なら経過時間を足す
 *
 * 「今日」の判定はレポート画面・ログ画面と同じく計測の開始時刻（JST）で行う。
 * タスクごとの累計時間（Task.elapsed）は使わない。累計だと過去の記録が
 * 今日の値として表示されてしまうため。
 *
 * 毎秒の再描画は呼び出し側の useTimerSync が担うため、ここでは tick しない。
 */
export function useTodayTrackedSec(initialSec: number, nowMs: number): number {
  const runningTaskId = useTimerStore((s) => s.runningTaskId);
  const startedAtMs = useTimerStore((s) => s.startedAtMs);
  const getElapsed = useTimerStore((s) => s.getElapsed);

  const [finishedSec, setFinishedSec] = useState(initialSec);

  // 停止をストアの購読で受け取る。購読はマウント後に始まるため、
  // それ以前の停止（サーバー集計に含まれている分）を二重に数えることはない。
  useEffect(
    () =>
      useTimerStore.subscribe((state, prev) => {
        const stopped = state.lastStopped;
        if (!stopped || stopped === prev.lastStopped) return;
        if (isStartedToday(stopped.startedAtMs, nowMs)) {
          setFinishedSec((sec) => sec + stopped.seconds);
        }
      }),
    [nowMs],
  );

  const liveSec =
    runningTaskId !== null &&
    startedAtMs !== null &&
    isStartedToday(startedAtMs, nowMs)
      ? getElapsed()
      : 0;

  return finishedSec + liveSec;
}
