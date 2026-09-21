import { test, expect, type Page } from "@playwright/test";
import { TasksPage } from "./pages/TasksPage";

/**
 * サイドバーの件数バッジが「やるべき残り」（今日期限＋期限切れの未完了）を表すことを確かめる。
 * 完了済みを数えていると、未完了が1件もないのに数字が残ってしまう。
 */

// 他のテストが残したタスクがあっても判定できるよう、前後の差分で確認する
async function readBadge(page: Page): Promise<number> {
  const badge = page.getByTestId("sidebar-task-count");
  if ((await badge.count()) === 0) return 0; // 0件のときはバッジ自体が出ない
  return Number((await badge.textContent())?.trim() ?? 0);
}

test.describe("サイドバーの件数バッジ", () => {
  test("期限切れのタスクを作ると増え、完了すると減ること", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    const title = `バッジ確認-${Date.now()}`;

    await page.goto("/tasks");
    const before = await readBadge(page);

    await tasksPage.createTask(title, { date: "2020-01-01", time: "09:00" });
    await expect(tasksPage.sectionRow("overdue", title)).toHaveCount(1);
    // 画面を再読み込みせずに増えること（レイアウトを取り直しているため）
    await expect(page.getByTestId("sidebar-task-count")).toHaveText(
      String(before + 1),
    );

    await tasksPage.toggleDone(title);

    // 完了したら「やるべき残り」から外れる
    await expect(async () => {
      expect(await readBadge(page)).toBe(before);
    }).toPass({ timeout: 10_000 });

    // 再読み込みしても同じ（サーバー側の集計とも一致している）
    await page.reload();
    expect(await readBadge(page)).toBe(before);

    await tasksPage.expandSection("done");
    await tasksPage.deleteTask(title);
  });

  test("期限のないタスクはバッジに数えないこと", async ({ page }) => {
    const tasksPage = new TasksPage(page);
    const title = `バッジ対象外-${Date.now()}`;

    await page.goto("/tasks");
    const before = await readBadge(page);

    await tasksPage.createTask(title);
    await expect(tasksPage.sectionRow("undated", title)).toHaveCount(1);

    expect(await readBadge(page)).toBe(before);

    await tasksPage.deleteTask(title);
  });
});
