import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/timer", () => ({
  stopTimer: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

import { TimerBar } from "@/components/layout/TimerBar";
import { useTimerStore } from "@/stores/timer-store";

const ACTIVE_TIMER = {
  taskId: "task-1",
  taskTitle: "資料作成",
  startedAtMs: Date.now() - 60_000,
};

function resetStore() {
  useTimerStore.setState({
    runningTaskId: null,
    runningTaskTitle: "",
    startedAtMs: null,
    accumulated: 0,
    lastStopped: null,
    stopSeq: 0,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

afterEach(() => {
  resetStore();
});

describe("TimerBar", () => {
  it("計測していなければ何も表示しないこと", () => {
    render(<TimerBar initialActiveTimer={null} />);

    expect(screen.queryByTestId("timer-bar")).not.toBeInTheDocument();
  });

  it("サーバーが計測中のタイマーを持っていれば、開いた時点で復元すること", () => {
    render(<TimerBar initialActiveTimer={ACTIVE_TIMER} />);

    expect(screen.getByTestId("timer-bar")).toBeInTheDocument();
    expect(useTimerStore.getState().runningTaskId).toBe("task-1");
  });

  it("開いた後に「計測中」の情報が渡ってきても、停止した計測を復元しないこと", () => {
    // 計測していない状態で開く
    const { rerender } = render(<TimerBar initialActiveTimer={null} />);

    // 画面から計測を開始する（この後 revalidatePath で再取得され、
    // initialActiveTimer に「計測中」が入った状態で渡ってくる）
    act(() => {
      useTimerStore.getState().start("task-1", "資料作成", Date.now());
    });
    rerender(<TimerBar initialActiveTimer={ACTIVE_TIMER} />);
    expect(screen.getByTestId("timer-bar")).toBeInTheDocument();

    // 停止する
    act(() => {
      useTimerStore.getState().stop();
    });

    // 「計測中」の情報が残っていても復元されない（以前はここで復活していた）
    expect(useTimerStore.getState().runningTaskId).toBeNull();
    expect(screen.queryByTestId("timer-bar")).not.toBeInTheDocument();
  });
});
