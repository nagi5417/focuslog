import { test, expect } from "@playwright/test";
import { TasksPage } from "./pages/TasksPage";
import fixture from "./fixtures/tasks.json";

const { tasks } = fixture;

test.describe("タスク CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
  });

  test("タスクを作成すると一覧に表示されること", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    const title = `テストタスク-${Date.now()}`;

    await tasksPage.createTask(title);

    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });
  });

  test("タスクを完了チェックすると完了したタスクセクションへ移動すること", async ({
    page,
  }) => {
    const tasksPage = new TasksPage(page);
    const title = `完了テスト-${Date.now()}`;

    await tasksPage.createTask(title);
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });

    await tasksPage.toggleDone(title);

    // 元のセクション（日付未設定）から消え、完了セクションへ移る
    await expect(tasksPage.sectionRow("undated", title)).toHaveCount(0);
    await tasksPage.expandSection("done");
    await expect(tasksPage.sectionRow("done", title)).toHaveCount(1);
  });

  test("期限切れのタスクを完了すると期限切れセクションから完了へ移動すること", async ({
    page,
  }) => {
    const tasksPage = new TasksPage(page);
    const title = `期限切れ完了-${Date.now()}`;

    await tasksPage.createTask(title, { date: "2020-01-01", time: "09:00" });
    await expect(tasksPage.sectionRow("overdue", title)).toHaveCount(1);

    await tasksPage.toggleDone(title);

    await expect(tasksPage.sectionRow("overdue", title)).toHaveCount(0);
    await tasksPage.expandSection("done");
    await expect(tasksPage.sectionRow("done", title)).toHaveCount(1);

    // 上記までは楽観的更新でも通るため、リロードして保存されたことまで確認する。
    // 完了直後にリロードすると送信中の Server Action が中断されるため少し待つ
    await page.waitForTimeout(2_000);
    await page.reload();
    await tasksPage.expandSection("done");
    await expect(tasksPage.sectionRow("done", title)).toHaveCount(1);
    await expect(tasksPage.sectionRow("overdue", title)).toHaveCount(0);
  });

  test("完了を外すと元のセクションへ戻ること", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    const title = `完了解除-${Date.now()}`;

    await tasksPage.createTask(title, { date: "2020-01-01", time: "09:00" });
    await tasksPage.toggleDone(title);
    await tasksPage.expandSection("done");
    await expect(tasksPage.sectionRow("done", title)).toHaveCount(1);

    await tasksPage.toggleDone(title);

    // 期限は過去のままなので期限切れセクションに戻る
    await expect(tasksPage.sectionRow("done", title)).toHaveCount(0);
    await expect(tasksPage.sectionRow("overdue", title)).toHaveCount(1);
  });

  test("タスクを編集するとタイトルが更新されること", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    const originalTitle = `編集前-${Date.now()}`;
    const updatedTitle = `編集後-${Date.now()}`;

    await tasksPage.createTask(originalTitle);
    await expect(page.getByText(originalTitle)).toBeVisible({ timeout: 5_000 });

    await tasksPage.openEditDialog(originalTitle);
    await page.getByRole("textbox", { name: /タスク名|タイトル/ }).clear();
    await page
      .getByRole("textbox", { name: /タスク名|タイトル/ })
      .fill(updatedTitle);
    await page.getByRole("button", { name: /保存|更新/ }).click();

    await expect(page.getByText(updatedTitle)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(originalTitle)).not.toBeVisible();
  });

  test("タスクを削除すると一覧から消えること", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    const title = `削除テスト-${Date.now()}`;

    await tasksPage.createTask(title);
    await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });

    await tasksPage.deleteTask(title);

    await expect(page.getByText(title)).not.toBeVisible({ timeout: 5_000 });
  });
});

test("fixture のタスクデータが存在すること", async () => {
  expect(tasks.length).toBeGreaterThan(0);
  expect(tasks[0].title).toBeTruthy();
});
