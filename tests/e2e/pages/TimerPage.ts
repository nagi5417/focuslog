import type { Page } from "@playwright/test";

export class TimerPage {
  constructor(private page: Page) {}

  async startTimer(taskTitle: string) {
    const row = this.page
      .locator("[data-testid='task-row']")
      .filter({ hasText: taskTitle });

    // 行が非表示（セクションが閉じている）なら「日付未設定のタスク」を開く
    // （E2E で作るタスクは期限を指定しないためこのセクションに入る）
    if (!(await row.isVisible())) {
      await this.page
        .getByRole("button", { name: /日付未設定のタスク/ })
        .click();
      await row.waitFor({ state: "visible", timeout: 3_000 });
      // SectionCard の grid-template-rows アニメーション (380ms) が完了するまで待機
      await this.page.waitForTimeout(500);
    }

    const toggle = row.locator("[data-testid='timer-toggle']");
    // SectionCard の overflow-hidden と overflow-y-auto の組み合わせで
    // Playwright の自動スクロールがスクロールコンテナと干渉するため JS で直接クリック
    await toggle.evaluate((el: HTMLElement) => el.click());
  }

  async stopTimer() {
    await this.page
      .locator("[data-testid='timer-bar']")
      .getByRole("button", { name: "停止" })
      .click();
  }

  async getTimerBarTaskName() {
    return this.page.locator("[data-testid='timer-task-name']").textContent();
  }

  async isTimerBarVisible() {
    return this.page.locator("[data-testid='timer-bar']").isVisible();
  }
}
