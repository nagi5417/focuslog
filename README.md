This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

メール確認を実送信する場合は、Resend の API キーに加えて検証済みドメインの送信元を設定してください。

```bash
RESEND_API_KEY="re_..."
EMAIL_FROM="FocusLog <noreply@your-domain.example>"
```

`EMAIL_FROM` を未設定にすると `onboarding@resend.dev` を使いますが、この送信元は Resend アカウント所有者宛などに制限されるため、一般ユーザーには届かない場合があります。

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 設計上の工夫

実装にあたって判断したポイントを、背景と理由つきで記録しています。

### 認証メールの送信回数制限

関連 PR: [#5 確認メールの再送](https://github.com/nagi5417/focuslog/pull/5) / [#6 送信回数制限](https://github.com/nagi5417/focuslog/pull/6)

#### 課題

確認メールが届かなかったユーザー向けに「未確認のまま再登録したら確認メールを再送する」機能を追加したところ、再送に回数制限がないことに気づいた。

- 第三者が**他人のメールアドレスで登録を繰り返すだけで**、そのアドレスにメールを何通でも送りつけられる（メール爆撃）
- 送信サービスの無料枠（Resend: 100通/日）を使い切られると、**正規ユーザーにもメールが届かなくなる**
- パスワードリセットにも同じ穴があった。さらに送信失敗時だけ画面がエラーになるため、**「エラーになるアドレス＝登録済み」と外部から判別できた**

#### 対策

確認メール・パスワード再設定メールの送信を、**同じアドレス・同じ用途ごとに「前回から1分以上」かつ「24時間で5通まで」** に制限した。

| 状況 | 画面の表示 | 実際の挙動 |
| --- | --- | --- |
| 制限内 | 「送信しました」 | メールを送る |
| 制限に達した | 「送信しました」 | **メールを送らず、トークンも発行しない** |
| パスワードリセットで送信失敗 | 「送信しました」 | 原因をサーバーログに記録する |

#### 設計判断

| 判断 | 理由 |
| --- | --- |
| **制限に達しても成功と同じ表示にする** | 制限が発動するのは送信履歴があるアドレス、つまりほぼ登録済みのアドレス。「上限に達しました」と表示すると、アドレスを入力するだけで登録の有無を調べられてしまう（アカウント列挙攻撃）。本人が制限に気づけない不便さより、登録情報の保護を優先した |
| **制限中は新しいトークンを発行しない** | トークンは発行し直すと古いものが無効になる。制限中に発行すると直前に届いたメールのリンクが使えなくなり、本人が確認を完了できなくなるため |
| **送信の前に履歴を記録する** | 送信に失敗した回も1回に数え、失敗時の連打で送信サービスに負荷をかけ続けられないようにした |
| **回数の記録に DB のテーブルを使う** | Vercel や AWS Lambda などのサーバーレス環境では、リクエストごとに別のインスタンスが処理しうるため、メモリ上のカウンターでは回数を共有できない。既存トークンの有効期限から送信時刻を逆算する案（スキーマ変更なし）も検討したが、「間隔」しか判定できず1日の上限をかけられないため採用しなかった |
| **宛先を小文字に正規化して数える** | `Victim@example.com` のように大文字小文字を変えるだけで制限をすり抜けられるのを防ぐ |
| **判定ロジックを `"use server"` ファイルの外に置く** | Next.js では `"use server"` ファイルで export した関数がすべてブラウザから呼べる Server Action になる。内部用の判定関数が外部に公開されないよう、別モジュールにした |
| **同時リクエストでの誤差は許容する** | 判定と記録の間にわずかな隙間があり、同時に送られると上限を1通程度超えうる。目的は大量送信の抑止であり、厳密に直列化する複雑さには見合わないと判断した |
| **古い履歴は書き込みのたびに削除する** | 24時間を過ぎた履歴は判定に使わない。定期実行の仕組みを追加せずにテーブルを小さく保てる |

#### 検証

- ユニットテストを16件追加した（制限の境界値、大文字小文字の正規化、制限中にトークンを発行しないこと、パスワードリセットの送信失敗時の応答など）
- テストが本当に不具合を検出できるか確かめるため、**実装を4通り意図的に壊し**（1分判定の境界 / 5通の上限 / リセット側の判定漏れ / 判定とトークン発行の順序の逆転）、それぞれ対応するテストが失敗することを確認した
- マイグレーション SQL は DB に接続しない `prisma migrate diff` で生成し、作業中に本番 DB へ誤って接続するリスクを避けた

#### 今後の課題

- **IP アドレス単位の制限**: 今回はアドレス単位の制限のため、多数の異なるアドレスにばらまく攻撃は防げない
- **メールアドレスの大文字小文字の扱い**: `User.email` の一意制約が大文字小文字を区別するため、大文字小文字違いで別アカウントを作れてしまう（送信回数は正規化して数えるため、メール爆撃自体は防げている）

#### 関連ファイル

- [src/lib/auth/email-rate-limit.ts](src/lib/auth/email-rate-limit.ts) — 判定ロジック
- [src/lib/actions/auth.ts](src/lib/actions/auth.ts) — 登録・パスワードリセット・退会への適用
- [prisma/schema.prisma](prisma/schema.prisma) — `EmailSendLog` テーブル

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
