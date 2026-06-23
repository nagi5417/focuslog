import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  AccentContext,
  type Accent,
} from "@/components/providers/AccentProvider";
import { AccentSelector } from "./AccentSelector";

const mocks = vi.hoisted(() => ({
  updateSetting: vi.fn(),
}));

vi.mock("@/lib/actions/setting", () => ({
  updateSetting: mocks.updateSetting,
}));

function renderWithAccent({
  initialProviderAccent,
}: {
  initialProviderAccent: Accent;
}) {
  function Wrapper() {
    const [accent, setAccent] = useState<Accent>(initialProviderAccent);
    return (
      <AccentContext value={{ accent, setAccent }}>
        <AccentSelector />
      </AccentContext>
    );
  }

  render(<Wrapper />);
}

describe("AccentSelector", () => {
  it("初期表示では実表示に使うProvider値を選択状態にすること", async () => {
    renderWithAccent({
      initialProviderAccent: "blue",
    });

    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Green" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("ユーザー選択後に古い初期値へ戻さないこと", async () => {
    const user = userEvent.setup();
    mocks.updateSetting.mockResolvedValue({
      ok: true,
      data: { theme: "system", accent: "green" },
    });

    renderWithAccent({
      initialProviderAccent: "blue",
    });

    await user.click(screen.getByRole("button", { name: "Green" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Green" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(mocks.updateSetting).toHaveBeenCalledWith({ accent: "green" });
  });
});
