import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
let mockPathname = "/tasks";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

vi.mock("@/lib/actions/timer", () => ({
  resumeLastTimer: vi.fn(),
  stopTimer: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";
import { resumeLastTimer, stopTimer } from "@/lib/actions/timer";
import { useSearchShortcutStore } from "@/stores/search-shortcut-store";
import { useTaskPageUiStore } from "@/stores/task-page-ui-store";
import { useTimerStore } from "@/stores/timer-store";

const mockResumeLastTimer = vi.mocked(resumeLastTimer);
const mockStopTimer = vi.mocked(stopTimer);
const mockToastInfo = vi.mocked(toast.info);

// 押下したキーイベントが preventDefault されずに残ったか（= ブラウザ標準の動作に任せたか）を返す
function press(
  key: string,
  init: KeyboardEventInit = {},
  target: Element = document.body,
): boolean {
  return fireEvent.keyDown(target, { key, ...init });
}

function appendElement(html: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return wrapper.firstElementChild as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPathname = "/tasks";
  useTaskPageUiStore.setState({ isCreateOpen: false });
  useSearchShortcutStore.setState({ openSearch: null });
  useTimerStore.setState({
    runningTaskId: null,
    runningTaskTitle: "",
    startedAtMs: null,
    accumulated: 0,
    lastStopped: null,
    stopSeq: 0,
  });
  mockStopTimer.mockResolvedValue({ ok: true, data: undefined });
});

afterEach(() => {
  // テスト中に追加した入力欄やダイアログを片付ける
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("N: 新規タスク", () => {
  it("タスク画面では画面遷移せずに作成を開くこと", () => {
    render(<KeyboardShortcuts />);

    press("n");

    expect(useTaskPageUiStore.getState().isCreateOpen).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("タスク画面以外ではタスク画面へ移動して作成を開くこと", () => {
    mockPathname = "/reports";
    render(<KeyboardShortcuts />);

    press("N");

    expect(useTaskPageUiStore.getState().isCreateOpen).toBe(true);
    expect(mockPush).toHaveBeenCalledWith("/tasks");
  });
});

describe("F: 検索", () => {
  it("検索欄を登録している画面では F でその画面の検索を開くこと", () => {
    const openSearch = vi.fn();
    useSearchShortcutStore.getState().registerSearch(openSearch);
    render(<KeyboardShortcuts />);

    const notPrevented = press("f");

    expect(openSearch).toHaveBeenCalledTimes(1);
    // 開いた検索欄に「f」が入力されないよう既定の動作を止めている
    expect(notPrevented).toBe(false);
  });

  it("検索欄のない画面では何もしないこと", () => {
    mockPathname = "/reports";
    render(<KeyboardShortcuts />);

    const notPrevented = press("f");

    expect(notPrevented).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("検索欄に入力中の F は文字として入力させ、奪わないこと", () => {
    const openSearch = vi.fn();
    useSearchShortcutStore.getState().registerSearch(openSearch);
    render(<KeyboardShortcuts />);
    const input = appendElement('<input type="text" />');

    const notPrevented = press("f", {}, input);

    expect(openSearch).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it("⌘F / Ctrl+F はブラウザのページ内検索に任せ、アプリでは扱わないこと", () => {
    const openSearch = vi.fn();
    useSearchShortcutStore.getState().registerSearch(openSearch);
    render(<KeyboardShortcuts />);

    const notPreventedMac = press("f", { metaKey: true });
    const notPreventedWin = press("f", { ctrlKey: true });

    expect(openSearch).not.toHaveBeenCalled();
    expect(notPreventedMac).toBe(true);
    expect(notPreventedWin).toBe(true);
  });
});

describe("G → R: レポートへ", () => {
  it("G の後に R を押すとレポート画面へ移動すること", () => {
    render(<KeyboardShortcuts />);

    press("g");
    press("r");

    expect(mockPush).toHaveBeenCalledWith("/reports");
  });

  it("R だけでは移動しないこと", () => {
    render(<KeyboardShortcuts />);

    press("r");

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("G から1秒を過ぎた R は無視すること", () => {
    const now = vi.spyOn(Date, "now");
    render(<KeyboardShortcuts />);

    now.mockReturnValue(10_000);
    press("g");
    now.mockReturnValue(11_500);
    press("r");

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("G と R の間に別のキーを挟むと移動しないこと", () => {
    render(<KeyboardShortcuts />);

    press("g");
    press("x");
    press("r");

    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("Space: 計測の開始・停止", () => {
  it("計測中なら停止すること", async () => {
    useTimerStore.setState({
      runningTaskId: "task-1",
      startedAtMs: Date.now(),
    });
    render(<KeyboardShortcuts />);

    press(" ");

    await waitFor(() =>
      expect(useTimerStore.getState().runningTaskId).toBeNull(),
    );
    expect(mockStopTimer).toHaveBeenCalledTimes(1);
    expect(mockResumeLastTimer).not.toHaveBeenCalled();
  });

  it("計測していなければ直前のタスクを再開すること", async () => {
    mockResumeLastTimer.mockResolvedValue({
      ok: true,
      data: { taskId: "task-9", title: "資料作成", startedAtMs: 1_000 },
    });
    render(<KeyboardShortcuts />);

    press(" ");

    await waitFor(() =>
      expect(useTimerStore.getState().runningTaskId).toBe("task-9"),
    );
    expect(useTimerStore.getState().runningTaskTitle).toBe("資料作成");
    expect(mockStopTimer).not.toHaveBeenCalled();
  });

  it("再開できるタスクがなければ通知だけ出して開始しないこと", async () => {
    mockResumeLastTimer.mockResolvedValue({ ok: true, data: null });
    render(<KeyboardShortcuts />);

    press(" ");

    await waitFor(() =>
      expect(mockToastInfo).toHaveBeenCalledWith(
        "再開できるタスクがありません",
      ),
    );
    expect(useTimerStore.getState().runningTaskId).toBeNull();
  });

  it("ボタンにフォーカスがあるときは、ボタンの標準操作を優先して反応しないこと", () => {
    render(<KeyboardShortcuts />);
    const button = appendElement("<button>完了</button>");

    press(" ", {}, button);

    expect(mockResumeLastTimer).not.toHaveBeenCalled();
    expect(mockStopTimer).not.toHaveBeenCalled();
  });
});

describe("タスク画面の開閉状態のリセット", () => {
  it("タスク画面以外にいるときは、開いたままの作成モーダルをリセットすること", () => {
    useTaskPageUiStore.setState({ isCreateOpen: true });
    mockPathname = "/reports";

    render(<KeyboardShortcuts />);

    expect(useTaskPageUiStore.getState().isCreateOpen).toBe(false);
  });

  it("タスク画面へ遷移してきたときは、他画面で立てた「開いて」を打ち消さないこと", () => {
    // 他画面で N を押した直後の状態
    useTaskPageUiStore.setState({ isCreateOpen: true });
    mockPathname = "/tasks";

    render(<KeyboardShortcuts />);

    expect(useTaskPageUiStore.getState().isCreateOpen).toBe(true);
  });
});

describe("反応しない状況", () => {
  it("文字入力中は N を奪わないこと", () => {
    render(<KeyboardShortcuts />);
    const textarea = appendElement("<textarea></textarea>");

    press("n", {}, textarea);

    expect(useTaskPageUiStore.getState().isCreateOpen).toBe(false);
  });

  it("IME 変換中は反応しないこと", () => {
    render(<KeyboardShortcuts />);

    press("n", { isComposing: true });

    expect(useTaskPageUiStore.getState().isCreateOpen).toBe(false);
  });

  it("ダイアログ表示中は反応しないこと", () => {
    const openSearch = vi.fn();
    useSearchShortcutStore.getState().registerSearch(openSearch);
    render(<KeyboardShortcuts />);
    appendElement('<div role="dialog"></div>');

    press("n");
    press("f");

    expect(useTaskPageUiStore.getState().isCreateOpen).toBe(false);
    expect(openSearch).not.toHaveBeenCalled();
  });

  it("キーの押しっぱなし（repeat）は無視すること", () => {
    render(<KeyboardShortcuts />);

    press("n", { repeat: true });

    expect(useTaskPageUiStore.getState().isCreateOpen).toBe(false);
  });

  it("⌘ 以外の修飾キー付きの N は無視すること", () => {
    render(<KeyboardShortcuts />);

    press("n", { altKey: true });

    expect(useTaskPageUiStore.getState().isCreateOpen).toBe(false);
  });
});
