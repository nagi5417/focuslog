import { Resend } from "resend";

// メール送信ユーティリティ。RESEND_API_KEY 未設定（ローカル開発）の場合は
// 実送信せずリンクをサーバーコンソールに出力し、登録〜確認フローを手元で完走できるようにする。
const apiKey = process.env.RESEND_API_KEY;
// 送信元アドレス。検証済み独自ドメインを使う本番では EMAIL_FROM で上書きする。
// 未設定時は Resend のテスト共有ドメインにフォールバックする
// （※このドメインは Resend アカウント所有者本人のメール宛にしか送れない）。
const FROM = process.env.EMAIL_FROM ?? "FocusLog <onboarding@resend.dev>";

async function sendMail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!apiKey) {
    console.info(
      `\n[dev mail] 宛先: ${to}\n件名: ${subject}\n本文:\n${html}\n`,
    );
    return;
  }

  const resend = new Resend(apiKey);
  // Resend は throw せず { data, error } を返すため、error を見て自分で例外化する。
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    throw new Error(`メール送信に失敗しました: ${error.message}`);
  }
}

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
): Promise<void> {
  const subject = "【FocusLog】メールアドレスの確認";
  const html = `
    <p>FocusLog へのご登録ありがとうございます。</p>
    <p>下のリンクをクリックしてメールアドレスを確認してください（24時間有効）。</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>お心当たりがない場合はこのメールを破棄してください。</p>
  `;
  await sendMail(to, subject, html);
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const subject = "【FocusLog】パスワードの再設定";
  const html = `
    <p>パスワード再設定のリクエストを受け付けました。</p>
    <p>下のリンクから新しいパスワードを設定してください（1時間有効）。</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>お心当たりがない場合はこのメールを破棄してください。</p>
  `;
  await sendMail(to, subject, html);
}
