import type { Page } from "@playwright/test";

export class AuthPage {
  constructor(private page: Page) {}

  async gotoLogin() {
    await this.page.goto("/login");
  }

  async gotoRegister() {
    await this.page.goto("/register");
  }

  async fillLoginForm(email: string, password: string) {
    await this.page.getByLabel("メールアドレス").fill(email);
    await this.page.getByLabel("パスワード").fill(password);
  }

  async submitLoginForm() {
    await this.page.getByRole("button", { name: "ログイン" }).click();
  }

  async fillRegisterForm(
    email: string,
    password: string,
    name = "E2E テストユーザー",
  ) {
    await this.page.getByLabel("名前").fill(name);
    await this.page.getByLabel("メールアドレス").fill(email);
    await this.page.getByLabel("パスワード").fill(password);
  }

  async submitRegisterForm() {
    await this.page.getByRole("button", { name: /アカウント.*作成/ }).click();
  }

  async getErrorMessage() {
    return this.page
      .locator("[role='alert'], .text-destructive")
      .first()
      .textContent();
  }
}
