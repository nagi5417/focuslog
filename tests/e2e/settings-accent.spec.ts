import { expect, test } from "@playwright/test";

test.describe("アクセントカラー設定", () => {
  test("Green を選択すると見た目と保存状態が Green になること", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: "Green" }).click();

    await expect(page.getByRole("button", { name: "Green" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.getAttribute("data-accent")),
      )
      .toBe("green");
    await expect(page.getByRole("button", { name: "Green" })).toBeEnabled();

    await page.reload();

    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.getAttribute("data-accent")),
      )
      .toBe("green");
    await expect(page.getByRole("button", { name: "Green" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Blue" }).click();

    await expect(page.getByRole("button", { name: "Blue" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.getAttribute("data-accent")),
      )
      .toBe("blue");
    await expect(page.getByRole("button", { name: "Blue" })).toBeEnabled();
  });
});
