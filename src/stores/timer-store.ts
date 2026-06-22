"use client";

import { create } from "zustand";

// 直近で停止（または別タスクへ切替）した計測の記録。
// seq は単調増加し、購読側が「未処理の停止か」を判定するために使う。
type LastStopped = { taskId: string; seconds: number; seq: number };

type TimerStore = {
  runningTaskId: string | null;
  runningTaskTitle: string;
  startedAtMs: number | null;
  accumulated: number;
  lastStopped: LastStopped | null;
  stopSeq: number;
  start: (taskId: string, title?: string, startedAtMs?: number) => void;
  stop: () => void;
  getElapsed: () => number;
};

export const useTimerStore = create<TimerStore>((set, get) => ({
  runningTaskId: null,
  runningTaskTitle: "",
  startedAtMs: null,
  accumulated: 0,
  lastStopped: null,
  stopSeq: 0,

  start(taskId, title = "", startedAtMs) {
    const prevId = get().runningTaskId;
    const nowMs = startedAtMs ?? Date.now();
    // 別タスクへ切り替える場合は、旧タスクの計測分を停止として記録する
    const switching = prevId !== null && prevId !== taskId;
    const seq = get().stopSeq + (switching ? 1 : 0);
    set({
      runningTaskId: taskId,
      runningTaskTitle: title,
      // タスクが切り替わる場合は accumulated をリセット
      accumulated: prevId === taskId ? get().accumulated : 0,
      startedAtMs: nowMs,
      lastStopped: switching
        ? { taskId: prevId as string, seconds: get().getElapsed(), seq }
        : get().lastStopped,
      stopSeq: seq,
    });
  },

  stop() {
    const prevId = get().runningTaskId;
    if (prevId === null) {
      set({
        runningTaskId: null,
        runningTaskTitle: "",
        startedAtMs: null,
        accumulated: 0,
      });
      return;
    }
    // 計測秒数を確定してから状態をリセット（購読側が elapsed に加算する）
    const seconds = get().getElapsed();
    const seq = get().stopSeq + 1;
    set({
      runningTaskId: null,
      runningTaskTitle: "",
      startedAtMs: null,
      accumulated: 0,
      lastStopped: { taskId: prevId, seconds, seq },
      stopSeq: seq,
    });
  },

  getElapsed() {
    const { startedAtMs, accumulated } = get();
    if (startedAtMs == null) return accumulated;
    return accumulated + Math.floor((Date.now() - startedAtMs) / 1000);
  },
}));
