// デプロイ後の動作確認用スクリプト。Server Actions(本文付き POST)が
// 実際に通るかを、ブラウザ経由のログインで検証する。
// CloudFront/API Gateway 周りの設定ミスは、単純な curl では再現しない
// ことがある（本文なし POST は通るが本文ありは 403、等）ため、
// 実際のフォーム送信で確認するのが確実。
//
// 使い方: node infra/scripts/test-login.mjs <BASE_URL>
//   例) node infra/scripts/test-login.mjs https://focuslog.dev
import { chromium } from "@playwright/test";

const BASE_URL = process.argv[2] ?? "https://focuslog.dev";
const EMAIL = "e2e-test@focuslog.test";
const PASSWORD = "TestPassword123!";

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500); // ハイドレーション完了を待つ
  await page.getByLabel("メールアドレス").fill(EMAIL);
  await page.getByLabel("パスワード").fill(PASSWORD);

  const [response] = await Promise.all([
    page
      .waitForResponse((res) => res.request().method() === "POST", {
        timeout: 15000,
      })
      .catch(() => null),
    page.getByRole("button", { name: "ログイン" }).click(),
  ]);

  if (response) {
    console.log("POSTリクエスト:", response.status(), response.url());
  } else {
    console.log("POSTリクエストが発生しませんでした");
  }

  await page.waitForURL(`${BASE_URL}/tasks`, { timeout: 10000 });
  console.log("✓ ログイン成功（Server Actions が正しく動作）");
  process.exitCode = 0;
} catch (e) {
  console.log("✗ 失敗:", e.message);
  console.log("現在のURL:", page.url());
  process.exitCode = 1;
} finally {
  await browser.close();
}
