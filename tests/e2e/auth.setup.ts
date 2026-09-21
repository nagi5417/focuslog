import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "tests/e2e/.auth/user.json";

setup(
  "認証セットアップ: テストユーザーでログインして storage state を保存",
  async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("e2e-test@focuslog.test");
    await page.getByLabel("パスワード").fill("TestPassword123!");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/tasks/, { timeout: 15_000 });

    await page.context().storageState({ path: AUTH_FILE });
  },
);
