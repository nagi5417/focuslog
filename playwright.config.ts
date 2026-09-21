import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // テストユーザーを DB に作成してログイン状態を保存する前処理
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // 認証フローのテスト（storageState 不要）
    {
      name: "auth-tests",
      testMatch: /auth\.spec\.ts/,
      dependencies: ["setup"],
    },
    // その他のテスト（storageState でログイン済み状態を使い回す）
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: [/auth\.spec\.ts/, /auth\.setup\.ts/],
    },
  ],
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
