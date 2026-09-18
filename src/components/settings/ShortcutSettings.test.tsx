import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ShortcutSettings } from "./ShortcutSettings";

const mocks = vi.hoisted(() => ({
  updateSetting: vi.fn(),
  refresh: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/actions/setting", () => ({
  updateSetting: mocks.updateSetting,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError },
}));

function getSwitch() {
  return screen.getByRole("switch", { name: "キーボードショートカット" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ShortcutSettings", () => {
  it("保存されている設定を初期表示に反映すること", () => {
    render(<ShortcutSettings initialEnabled={false} />);

    expect(getSwitch()).toHaveAttribute("aria-checked", "false");
  });

  it("オフに切り替えると保存し、レイアウトを取り直して反映すること", async () => {
    mocks.updateSetting.mockResolvedValue({
      ok: true,
      data: { theme: "system", accent: "blue", shortcutsEnabled: false },
    });
    const user = userEvent.setup();
    render(<ShortcutSettings initialEnabled />);

    await user.click(getSwitch());

    expect(getSwitch()).toHaveAttribute("aria-checked", "false");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(mocks.updateSetting).toHaveBeenCalledWith({
      shortcutsEnabled: false,
    });
  });

  it("保存に失敗したら元の状態に戻してエラーを表示すること", async () => {
    mocks.updateSetting.mockResolvedValue({
      ok: false,
      error: "保存に失敗しました",
    });
    const user = userEvent.setup();
    render(<ShortcutSettings initialEnabled />);

    await user.click(getSwitch());

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("保存に失敗しました"),
    );
    expect(getSwitch()).toHaveAttribute("aria-checked", "true");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("説明文をスイッチに関連付け、スクリーンリーダーで読み上げられるようにすること", () => {
    render(<ShortcutSettings initialEnabled />);

    expect(getSwitch()).toHaveAccessibleDescription(
      /音声入力などで誤って反応する場合はオフにしてください/,
    );
  });
});
