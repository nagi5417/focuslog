import { z } from "zod";

// 認証フォームの Zod スキーマ。フロント（react-hook-form）とサーバー（Server Actions）で共有する。
// zod 4 系の API: トップレベル z.email()、メッセージは { error } で指定する。
// パスワードは bcrypt の 72 バイト制限に合わせて上限 72 文字とする。

export const loginSchema = z.object({
  email: z.email({ error: "メールアドレスの形式が正しくありません" }),
  password: z.string().min(1, { error: "パスワードを入力してください" }),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, { error: "名前を入力してください" })
    .max(50, { error: "名前は50文字以内で入力してください" }),
  email: z.email({ error: "メールアドレスの形式が正しくありません" }),
  password: z
    .string()
    .min(8, { error: "パスワードは8文字以上で入力してください" })
    .max(72, { error: "パスワードは72文字以内で入力してください" }),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ error: "メールアドレスの形式が正しくありません" }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { error: "トークンが指定されていません" }),
  password: z
    .string()
    .min(8, { error: "パスワードは8文字以上で入力してください" })
    .max(72, { error: "パスワードは72文字以内で入力してください" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
