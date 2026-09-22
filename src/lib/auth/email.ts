import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { Resend } from "resend";

// 送信方式は環境変数で切り替える。
//   MAIL_PROVIDER=ses    → 本番(AWS)。IAM ロール認証のため API キー不要
//   MAIL_PROVIDER=resend → SES の審査待ち・障害時のフォールバック
//   未設定 かつ RESEND_API_KEY なし → ローカル開発。コンソールに出力するだけ
const provider = process.env.MAIL_PROVIDER;
const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "FocusLog <onboarding@resend.dev>";

// クライアントはコールドスタート時に1度だけ作り、以降の呼び出しで使い回す。
// 認証情報とリージョンは Lambda の実行ロールと AWS_REGION から自動解決される。
let sesClient: SESv2Client | undefined;
function getSesClient(): SESv2Client {
  sesClient ??= new SESv2Client({});
  return sesClient;
}

async function sendMail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (provider === "ses") {
    // 日本語の件名・本文が文字化けしないよう Charset を明示する。
    await getSesClient().send(
      new SendEmailCommand({
        FromEmailAddress: FROM,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Html: { Data: html, Charset: "UTF-8" } },
          },
        },
      }),
    );
    return;
  }

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
