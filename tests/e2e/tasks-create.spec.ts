import { test, expect } from "@playwright/test";
import { TasksPage } from "./pages/TasksPage";

test.describe("タスク作成モーダル", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
  });

  test("優先度を選んで作成すると優先度バッジが表示されること", async ({
    page,
  }) => {
    const tasksPage = new TasksPage(page);
    const title = `優先度高-${Date.now()}`;

    await tasksPage.createTask(title, { priority: "高" });

    // 期限なしのため「日付未設定のタスク」に入り、優先度バッジ「高」を持つ
    const row = tasksPage.sectionRow("undated", title);
    await expect(row).toHaveCount(1);
    await expect(row.getByText("高", { exact: true })).toHaveCount(1);
  });

  test("過去の期限で作成すると期限切れセクションに入り期限切れ表示になること", async ({
    page,
  }) => {
    const tasksPage = new TasksPage(page);
    const title = `期限切れ-${Date.now()}`;

    await tasksPage.createTask(title, { date: "2020-01-01", time: "09:00" });

    // 過去期限は専用の「期限切れ」セクションに入り、overdue フラグが立つ
    const row = tasksPage.sectionRow("overdue", title);
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute("data-overdue", "true");
  });

  test("未来の期限で作成すると今後のタスクに入り期限切れにならないこと", async ({
    page,
  }) => {
    const tasksPage = new TasksPage(page);
    const title = `未来期限-${Date.now()}`;

    await tasksPage.createTask(title, { date: "2099-12-31" });

    const todayRow = tasksPage.sectionRow("today", title);
    const upcomingRow = tasksPage.sectionRow("upcoming", title);
    await expect(todayRow).toHaveCount(0);
    await expect(upcomingRow).toHaveCount(1);
    await expect(upcomingRow).toHaveAttribute("data-overdue", "false");
  });

  test("タイトル未入力では追加ボタンが無効であること", async ({ page }) => {
    await page.getByRole("button", { name: "新規タスク" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 5_000 });

    await expect(dialog.getByRole("button", { name: /^追加/ })).toBeDisabled();
  });
});
