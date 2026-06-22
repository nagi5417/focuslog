"use server";

import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth/auth";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/auth/email";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import type { ActionResult } from "@/types";

// VerificationToken に type 列が無いため、identifier のプレフィックスで用途を区別する。
const VERIFY_PREFIX = "verify:";
const RESET_PREFIX = "reset:";
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24時間
const RESET_TTL_MS = 60 * 60 * 1000; // 1時間

function baseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

// ZodError の issues から ActionResult が要求する Record<string, string[]> を組み立てる。
// flattenError の戻り値型に依存せず、フィールド名（path[0]）ごとにメッセージを集約する。
function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      (result[key] ??= []).push(issue.message);
    }
  }
  return result;
}

// 用途別トークンを発行。同一 identifier の旧トークンを掃除してワンタイム性を担保する。
async function issueToken(
  prefix: string,
  email: string,
  ttlMs: number,
): Promise<string> {
  const identifier = `${prefix}${email}`;
  const token = randomUUID();
  const expires = new Date(Date.now() + ttlMs);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return token;
}

// サインアップ。確認メールを送り、emailVerified=null のままにする（確認後にログイン可）。
export async function register(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容を確認してください",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { name, email, password } = parsed.data;

  // 既存メールでも列挙攻撃を避けるため成功時と同じ応答を返す（内部では何もしない）。
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: true, data: undefined };
  }

  const passwordHash = await hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, emailVerified: null },
  });

  const token = await issueToken(VERIFY_PREFIX, email, VERIFY_TTL_MS);
  await sendVerificationEmail(
    email,
    `${baseUrl()}/verify-email?token=${token}`,
  );

  return { ok: true, data: undefined };
}

// メール確認。token を検証し emailVerified に日時をセットする。
export async function verifyEmail(token: string): Promise<ActionResult> {
  if (!token) {
    return { ok: false, error: "トークンが指定されていません" };
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
  if (!record || !record.identifier.startsWith(VERIFY_PREFIX)) {
    return { ok: false, error: "無効な確認リンクです" };
  }
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return { ok: false, error: "確認リンクの有効期限が切れています" };
  }

  const email = record.identifier.slice(VERIFY_PREFIX.length);
  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });
  await prisma.verificationToken.delete({ where: { token } });

  return { ok: true, data: undefined };
}

// パスワードリセット要求。ユーザーの有無に関わらず同一応答を返す（列挙攻撃対策）。
export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容を確認してください",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = await issueToken(RESET_PREFIX, email, RESET_TTL_MS);
    await sendPasswordResetEmail(
      email,
      `${baseUrl()}/reset-password?token=${token}`,
    );
  }

  return { ok: true, data: undefined };
}

// パスワード再設定。token を検証して passwordHash を更新する。
// メール到達が証明されるため、未確認ユーザーはこの時点で確認済みにする。
export async function resetPassword(
  input: ResetPasswordInput,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容を確認してください",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { token, password } = parsed.data;
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
  if (!record || !record.identifier.startsWith(RESET_PREFIX)) {
    return { ok: false, error: "無効な再設定リンクです" };
  }
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return { ok: false, error: "再設定リンクの有効期限が切れています" };
  }

  const email = record.identifier.slice(RESET_PREFIX.length);
  const passwordHash = await hash(password, 10);
  await prisma.user.update({
    where: { email },
    data: { passwordHash, emailVerified: new Date() },
  });
  await prisma.verificationToken.delete({ where: { token } });

  return { ok: true, data: undefined };
}

// メール/パスワードでのログイン。redirect:false で NEXT_REDIRECT を避け、
// 成功時はクライアント側で遷移、失敗時は AuthError を ActionResult に変換する。
export async function loginWithCredentials(
  input: LoginInput,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容を確認してください",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          ok: false,
          error: "メールアドレスまたはパスワードが正しくありません",
        };
      }
      return { ok: false, error: "ログインに失敗しました" };
    }
    throw error;
  }

  return { ok: true, data: undefined };
}

// Google OAuth ログイン。form action として呼び、redirectTo で Google へ遷移させる。
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/tasks" });
}

// ログアウト。form action として呼び、/login へ遷移させる。
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
