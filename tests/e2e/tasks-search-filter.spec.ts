import { test, expect } from "@playwright/test";
import { TasksPage } from "./pages/TasksPage";

test.describe("タスクの検索とフィルタ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
  });

  test("キーワード検索でタイトルが絞り込まれること", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    const token = Date.now();
    const titleA = `検索対象A-${token}`;
    const titleB = `検索対象B-${token}`;

    await tasksPage.createTask(titleA);
    await tasksPage.createTask(titleB);

    // 絞り込み前は両方存在する
    await expect(tasksPage.getTaskRow(titleA)).toHaveCount(1);
    await expect(tasksPage.getTaskRow(titleB)).toHaveCount(1);

    await tasksPage.search(titleA);

    // A のみ残り、B は一覧から消える
    await expect(tasksPage.getTaskRow(titleA)).toHaveCount(1);
    await expect(tasksPage.getTaskRow(titleB)).toHaveCount(0);

    // 検索を閉じると両方戻る
    await tasksPage.clearSearch();
    await expect(tasksPage.getTaskRow(titleA)).toHaveCount(1);
    await expect(tasksPage.getTaskRow(titleB)).toHaveCount(1);
  });

  test("F で検索入力が開いてフォーカスされること", async ({ page }) => {
    const tasksPage = new TasksPage(page);

    // ハイドレーション完了（keydown リスナー登録）を待ってからショートカット
    await expect(
      page.getByRole("button", { name: "新規タスク" }),
    ).toBeVisible();

    const input = tasksPage.searchInput();
    // ハイドレーション直後のキー取りこぼしを吸収するためリトライ
    await expect(async () => {
      await tasksPage.openSearchWithShortcut();
      await expect(input).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 8_000 });

    await expect(input).toBeFocused();
  });

  test("優先度フィルタで絞り込みとクリアができること", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    const token = Date.now();
    const highTitle = `フィルタ高-${token}`;
    const lowTitle = `フィルタ低-${token}`;

    await tasksPage.createTask(highTitle, { priority: "高" });
    await tasksPage.createTask(lowTitle, { priority: "低" });

    await expect(tasksPage.getTaskRow(highTitle)).toHaveCount(1);
    await expect(tasksPage.getTaskRow(lowTitle)).toHaveCount(1);

    // 「高」のみで絞り込む
    await tasksPage.filterByPriority(["高"]);
    await expect(tasksPage.getTaskRow(highTitle)).toHaveCount(1);
    await expect(tasksPage.getTaskRow(lowTitle)).toHaveCount(0);

    // クリアで両方戻る
    await tasksPage.clearPriorityFilter();
    await expect(tasksPage.getTaskRow(highTitle)).toHaveCount(1);
    await expect(tasksPage.getTaskRow(lowTitle)).toHaveCount(1);
  });
});
