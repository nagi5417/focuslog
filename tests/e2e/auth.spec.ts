import { test, expect } from "@playwright/test";
import { AuthPage } from "./pages/AuthPage";
import fixture from "./fixtures/tasks.json";

const { testUser } = fixture;

test.describe("認証フロー", () => {
  test("未認証で /tasks にアクセスすると /login にリダイレクトされること", async ({
    page,
  }) => {
    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/login/);
  });

  test("不正なパスワードでログインするとエラーメッセージが表示されること", async ({
    page,
  }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.fillLoginForm(testUser.email, "wrongpassword");
    await auth.submitLoginForm();

    await expect(
      page.locator("[role='alert'], .text-destructive").first(),
    ).toBeVisible();
  });

  // Resend メール送信のモックが必要なためスキップ（テスト環境では送信が失敗する）
  test.skip("メール/パスワードで登録するとメール確認画面に遷移すること", async ({
    page,
  }) => {
    const auth = new AuthPage(page);
    await auth.gotoRegister();

    const uniqueEmail = `test-${Date.now()}@focuslog.test`;
    await auth.fillRegisterForm(uniqueEmail, "TestPassword123!");
    await auth.submitRegisterForm();

    // メール確認画面 or 確認メール送信済みのメッセージが表示されること
    await expect(
      page.getByText(/確認メール|メールを確認|verify/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("存在しないメールでログインするとエラーメッセージが表示されること", async ({
    page,
  }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.fillLoginForm("nonexistent@focuslog.test", "SomePassword123!");
    await auth.submitLoginForm();

    await expect(
      page.locator("[role='alert'], .text-destructive").first(),
    ).toBeVisible();
  });
});
