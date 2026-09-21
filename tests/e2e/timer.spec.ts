import { test, expect } from "@playwright/test";
import { TasksPage } from "./pages/TasksPage";
import { TimerPage } from "./pages/TimerPage";

async function createAndGetTask(
  page: import("@playwright/test").Page,
  title: string,
) {
  const tasksPage = new TasksPage(page);
  await tasksPage.createTask(title);
  await expect(page.getByText(title)).toBeVisible({ timeout: 5_000 });
}

test.describe("タイマーフロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks");
  });

  test("▶ ボタンクリックでタイマーバーが表示されること", async ({ page }) => {
    const title = `タイマーテスト-${Date.now()}`;
    await createAndGetTask(page, title);

    const timerPage = new TimerPage(page);
    await timerPage.startTimer(title);

    await expect(page.locator("[data-testid='timer-bar']")).toBeVisible({
      timeout: 5_000,
    });
    const barText = await timerPage.getTimerBarTaskName();
    expect(barText).toContain(title);
  });

  test("別タスクの ▶ をクリックすると前タスクが停止して新タスクが開始されること", async ({
    page,
  }) => {
    const title1 = `タイマータスク1-${Date.now()}`;
    const title2 = `タイマータスク2-${Date.now()}`;
    await createAndGetTask(page, title1);
    await createAndGetTask(page, title2);

    const timerPage = new TimerPage(page);
    await timerPage.startTimer(title1);
    await expect(page.locator("[data-testid='timer-bar']")).toBeVisible({
      timeout: 5_000,
    });

    await timerPage.startTimer(title2);

    // タイマーバーが新タスク名に切り替わること
    await expect(async () => {
      const barText = await timerPage.getTimerBarTaskName();
      expect(barText).toContain(title2);
    }).toPass({ timeout: 5_000 });
  });

  test("停止ボタンクリックでタイマーバーが非表示になること", async ({
    page,
  }) => {
    const title = `停止テスト-${Date.now()}`;
    await createAndGetTask(page, title);

    const timerPage = new TimerPage(page);
    await timerPage.startTimer(title);
    await expect(page.locator("[data-testid='timer-bar']")).toBeVisible({
      timeout: 5_000,
    });

    await timerPage.stopTimer();

    await expect(page.locator("[data-testid='timer-bar']")).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test("タイマー計測中にリロードしてもタイマーが復元されること", async ({
    page,
  }) => {
    const title = `リロードテスト-${Date.now()}`;
    await createAndGetTask(page, title);

    const timerPage = new TimerPage(page);
    await timerPage.startTimer(title);
    await expect(page.locator("[data-testid='timer-bar']")).toBeVisible({
      timeout: 5_000,
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // リロード後もタイマーバーが表示されていること（サーバー状態の維持）
    await expect(page.locator("[data-testid='timer-bar']")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("停止後にリロードなしで経過時間がタスク行へ反映されること", async ({
    page,
  }) => {
    const tasksPage = new TasksPage(page);
    const title = `稼働時間反映-${Date.now()}`;
    await createAndGetTask(page, title);

    // 計測前は経過時間が未表示（"–"）
    expect(await tasksPage.getElapsedText(title)).toBe("–");

    const timerPage = new TimerPage(page);
    await timerPage.startTimer(title);
    await expect(page.locator("[data-testid='timer-bar']")).toBeVisible({
      timeout: 5_000,
    });

    // durationSec が 1 以上になるよう待ってから停止
    await page.waitForTimeout(2_500);
    await timerPage.stopTimer();
    await expect(page.locator("[data-testid='timer-bar']")).not.toBeVisible({
      timeout: 5_000,
    });

    // リロードせずに経過時間が "HH:MM:SS" 形式へ更新される（バグ修正の検証）
    await expect(async () => {
      const text = await tasksPage.getElapsedText(title);
      expect(text).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    }).toPass({ timeout: 5_000 });
  });
});
