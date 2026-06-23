import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSelector } from "./ThemeSelector";

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  updateSetting: vi.fn(),
  useTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: mocks.useTheme,
}));

vi.mock("@/lib/actions/setting", () => ({
  updateSetting: mocks.updateSetting,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useTheme.mockReturnValue({
    theme: "light",
    setTheme: mocks.setTheme,
    themes: ["light", "dark", "system"],
  });
  mocks.updateSetting.mockResolvedValue({
    ok: true,
    data: { theme: "dark", accent: "blue" },
  });
});

describe("ThemeSelector", () => {
  it("現在のテーマのボタンに aria-pressed='true' が付くこと", () => {
    render(<ThemeSelector initialTheme="system" />);

    expect(screen.getByRole("button", { name: "ライト" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "ダーク" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "システム" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("ボタンクリックでテーマ変更と設定保存が呼ばれること", async () => {
    const user = userEvent.setup();
    render(<ThemeSelector initialTheme="light" />);

    await user.click(screen.getByRole("button", { name: "ダーク" }));

    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
    expect(mocks.updateSetting).toHaveBeenCalledWith({ theme: "dark" });
  });

  it("next-themes の値が未確定なら initialTheme を使うこと", () => {
    mocks.useTheme.mockReturnValue({
      theme: undefined,
      setTheme: mocks.setTheme,
      themes: ["light", "dark", "system"],
    });

    render(<ThemeSelector initialTheme="system" />);

    expect(screen.getByRole("button", { name: "システム" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
