import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTodayTrackedSec } from "@/hooks/useTodayTrackedSec";
import { useTimerStore } from "@/stores/timer-store";

// JST 2026-06-13 12:00 = UTC 2026-06-13 03:00（テストの「今」を固定）
const NOW_MS = Date.UTC(2026, 5, 13, 3, 0, 0, 0);
// JST 2026-06-13 00:00 = UTC 2026-06-12 15:00
const TODAY_START_MS = Date.UTC(2026, 5, 12, 15, 0, 0, 0);
const INITIAL_SEC = 1_800; // サーバーで集計した今日の停止済み計測（30分）

function startTimerAt(startedAtMs: number) {
  useTimerStore.setState({
    runningTaskId: "task-1",
    runningTaskTitle: "タスク",
    startedAtMs,
    accumulated: 0,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW_MS);
  useTimerStore.setState({
    runningTaskId: null,
    runningTaskTitle: "",
    startedAtMs: null,
    accumulated: 0,
    lastStopped: null,
    stopSeq: 0,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTodayTrackedSec", () => {
  it("計測中でなければサーバー集計値をそのまま返すこと", () => {
    const { result } = renderHook(() =>
      useTodayTrackedSec(INITIAL_SEC, NOW_MS),
    );

    expect(result.current).toBe(INITIAL_SEC);
  });

  it("今日開始の計測中は経過時間を加算すること", () => {
    startTimerAt(NOW_MS - 600 * 1000);

    const { result } = renderHook(() =>
      useTodayTrackedSec(INITIAL_SEC, NOW_MS),
    );

    expect(result.current).toBe(INITIAL_SEC + 600);
  });

  it("昨日から続く計測中の経過時間は加算しないこと", () => {
    // 前日 23:00（JST）開始
    startTimerAt(TODAY_START_MS - 60 * 60 * 1000);

    const { result } = renderHook(() =>
      useTodayTrackedSec(INITIAL_SEC, NOW_MS),
    );

    expect(result.current).toBe(INITIAL_SEC);
  });

  it("今日開始の計測を停止すると、その秒数が加算されたまま残ること", () => {
    startTimerAt(NOW_MS - 300 * 1000);
    const { result, rerender } = renderHook(() =>
      useTodayTrackedSec(INITIAL_SEC, NOW_MS),
    );

    act(() => useTimerStore.getState().stop());
    rerender();

    // 計測中の加算が停止済みの加算に置き換わり、合計は変わらない
    expect(result.current).toBe(INITIAL_SEC + 300);
  });

  it("昨日開始の計測を停止しても加算しないこと", () => {
    startTimerAt(TODAY_START_MS - 60 * 60 * 1000);
    const { result, rerender } = renderHook(() =>
      useTodayTrackedSec(INITIAL_SEC, NOW_MS),
    );

    act(() => useTimerStore.getState().stop());
    rerender();

    expect(result.current).toBe(INITIAL_SEC);
  });

  it("マウント前の停止はサーバー集計に含まれているため二重に数えないこと", () => {
    startTimerAt(NOW_MS - 300 * 1000);
    useTimerStore.getState().stop();

    const { result } = renderHook(() =>
      useTodayTrackedSec(INITIAL_SEC, NOW_MS),
    );

    expect(result.current).toBe(INITIAL_SEC);
  });

  it("別タスクへ切り替えたとき、今日開始だった前の計測を加算すること", () => {
    startTimerAt(NOW_MS - 120 * 1000);
    const { result, rerender } = renderHook(() =>
      useTodayTrackedSec(INITIAL_SEC, NOW_MS),
    );

    // task-2 を今この瞬間に開始 → task-1 の 120 秒が停止扱いになる
    act(() => useTimerStore.getState().start("task-2", "別タスク", NOW_MS));
    rerender();

    expect(result.current).toBe(INITIAL_SEC + 120);
  });
});
