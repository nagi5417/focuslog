import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

// メール/パスワード認証のロジック。Prisma + bcrypt に依存するため config.ts とは分離する。
// authorize の戻り値: 認証成功なら User、失敗なら null（null を返すと CredentialsSignin になる）。
export const credentialsProvider = Credentials({
  credentials: {
    email: { label: "メールアドレス", type: "email" },
    password: { label: "パスワード", type: "password" },
  },
  async authorize(rawCredentials) {
    // authorize の入力は信頼できないので必ず Zod で再検証する。
    const parsed = loginSchema.safeParse(rawCredentials);
    if (!parsed.success) {
      return null;
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // パスワード未設定（OAuth 専用ユーザー等）はメール認証では不可。
    if (!user?.passwordHash) {
      return null;
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    // メール未確認ユーザーはログイン不可（確認済みのみ許可する要件）。
    if (!user.emailVerified) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    };
  },
});
