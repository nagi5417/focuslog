import { test, expect, type Page } from "@playwright/test";
import { TasksPage } from "./pages/TasksPage";
import { TimerPage } from "./pages/TimerPage";

// ハイドレーション（keydown リスナーの登録）前のキー入力は取りこぼされるため、
// 押下と結果の確認をまとめてリトライする
async function pressUntil(
  page: Page,
  key: string,
  assertion: () => Promise<void>,
) {
  await expect(async () => {
    await page.keyboard.press(key);
    await assertion();
  }).toPass({ timeout: 8_000 });
}

// フォーカスをページ本体に戻す（ボタンにフォーカスがあると Space はボタン操作が優先される）
async function blurActiveElement(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

test.describe("キーボードショートカット", () => {
  test("N で新規タスクの作成が開くこと", async ({ page }) => {
    await page.goto("/tasks");
    const dialog = page.getByRole("dialog");

    await pressUntil(page, "n", async () => {
      await expect(dialog.getByText("新規タスク")).toBeVisible({ timeout: 1_000 });
    });
  });

  test("レポート画面で N を押すとタスク画面へ移動して作成が開くこと", async ({
    page,
  }) => {
    await page.goto("/reports");

    await pressUntil(page, "n", async () => {
      await expect(page).toHaveURL(/\/tasks$/, { timeout: 2_000 });
    });
    await expect(page.getByRole("dialog").getByText("新規タスク")).toBeVisible();
  });

  test("G → R でレポート画面へ移動すること", async ({ page }) => {
    await page.goto("/tasks");

    await expect(async () => {
      await page.keyboard.press("g");
      await page.keyboard.press("r");
      await expect(page).toHaveURL(/\/reports$/, { timeout: 2_000 });
    }).toPass({ timeout: 8_000 });
  });

  test("⌘F はアプリが奪わず、検索欄が開かないこと（ブラウザのページ内検索に任せる）", async ({
    page,
  }) => {
    const tasksPage = new TasksPage(page);
    await page.goto("/tasks");
    // キー入力の受け付けが始まっていることを F で確かめてから閉じる。
    // これを省くと、受け付け前に押して「何も起きなかった」だけでも通ってしまう
    await pressUntil(page, "f", async () => {
      await expect(tasksPage.searchInput()).toBeVisible({ timeout: 1_000 });
    });
    await tasksPage.clearSearch();
    await expect(tasksPage.searchInput()).toBeHidden();

    await page.keyboard.press("ControlOrMeta+f");
    await page.waitForTimeout(800);

    await expect(tasksPage.searchInput()).toBeHidden();
  });

  test("検索欄のない画面（レポート）では F を押しても何も起きないこと", async ({
    page,
  }) => {
    const tasksPage = new TasksPage(page);
    await page.goto("/tasks");
    await pressUntil(page, "f", async () => {
      await expect(tasksPage.searchInput()).toBeVisible({ timeout: 1_000 });
    });
    await tasksPage.clearSearch();

    // 再読み込みせずにレポート画面へ移る（受け付け状態を保ったまま）
    await page.getByRole("link", { name: "レポート" }).click();
    await expect(page).toHaveURL(/\/reports$/);

    await page.keyboard.press("f");
    await page.waitForTimeout(800);

    await expect(page).toHaveURL(/\/reports$/);
  });

  test("Space で計測を停止し、もう一度押すと直前のタスクを再開すること", async ({
    page,
  }) => {
    const tasksPage = new TasksPage(page);
    const timerPage = new TimerPage(page);
    const timerBar = page.locator("[data-testid='timer-bar']");
    const title = `ショートカット計測-${Date.now()}`;

    await page.goto("/tasks");
    await tasksPage.createTask(title);
    await timerPage.startTimer(title);
    await expect(timerBar).toBeVisible();

    // 計測の開始・停止はサーバーへの往復と画面の再取得を挟む。再取得の最中はキー入力の
    // 受け付けが一瞬張り替わり、押したキーが取りこぼされることがあるため、
    // 操作の前に落ち着くまで待ち、待ち時間も長めに取る
    const TIMER_TIMEOUT = 15_000;
    const SETTLE_MS = 700;

    // 停止
    await page.waitForTimeout(SETTLE_MS);
    await blurActiveElement(page);
    await page.keyboard.press("Space");
    await expect(timerBar).toBeHidden({ timeout: TIMER_TIMEOUT });

    // 直前に計測していたタスク（このテストで作ったもの）を再開
    await page.waitForTimeout(SETTLE_MS);
    await blurActiveElement(page);
    await page.keyboard.press("Space");
    await expect(timerBar).toBeVisible({ timeout: TIMER_TIMEOUT });
    await expect(page.locator("[data-testid='timer-task-name']")).toHaveText(
      title,
      { timeout: TIMER_TIMEOUT },
    );

    // 後片付け: 計測を止めておく（他のテストに計測中の状態を残さない）。
    // ここはショートカットの検証が目的ではないので、確実に止まる停止ボタンを使う
    await page.waitForTimeout(SETTLE_MS);
    await timerPage.stopTimer();
    await expect(timerBar).toBeHidden({ timeout: TIMER_TIMEOUT });
  });

  test("設定でオフにすると、キーに反応せずサイドバーの一覧と F の表示も消えること", async ({
    page,
  }) => {
    const toggle = page.getByRole("switch", { name: "キーボードショートカット" });
    const shortcutsHeading = page.getByText("Shortcuts", { exact: true });

    // まずオンの状態で N が効くこと（= キー入力の受け付けが始まっていること）を確かめる。
    // これを省くと、受け付け前に押して「何も起きなかった」だけでも通ってしまう
    await page.goto("/tasks");
    await pressUntil(page, "n", async () => {
      await expect(page.getByRole("dialog").getByText("新規タスク")).toBeVisible({
        timeout: 1_000,
      });
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(shortcutsHeading).toBeVisible();

    try {
      // 再読み込みせずに設定画面へ移り、オフにする
      await page.getByRole("link", { name: "設定" }).click();
      await expect(toggle).toHaveAttribute("aria-checked", "true");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-checked", "false");
      await expect(shortcutsHeading).toBeHidden();

      // タスク画面へ戻っても N に反応しない
      await page.getByRole("link", { name: /^タスク/ }).click();
      await expect(page).toHaveURL(/\/tasks$/);
      await blurActiveElement(page);
      await page.keyboard.press("n");
      await page.waitForTimeout(800);
      await expect(page.getByRole("dialog")).toBeHidden();

      // 検索ボタンから F の表示が消えている（名前が「検索」だけになる）
      await expect(
        page.getByRole("button", { name: "検索", exact: true }),
      ).toBeVisible();
    } finally {
      // 本番 DB 上のテスト用ユーザーなので、失敗しても必ずオンに戻す
      await page.goto("/settings");
      if ((await toggle.getAttribute("aria-checked")) === "false") {
        await toggle.click();
        // スイッチの表示は押した瞬間に変わる（楽観的更新）ため、それだけでは保存完了を保証しない。
        // 保存成功後の再描画でだけ現れるサイドバーの一覧を待ち、保存が中断されないようにする
        // （待たずに終わると、後続のテストがオフのまま実行されてしまう）
        await expect(shortcutsHeading).toBeVisible();
      }
    }
  });
});
