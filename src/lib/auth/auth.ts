import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth/config";
import { credentialsProvider } from "@/lib/auth/credentials";

// アプリ本体の NextAuth インスタンス。adapter（Google の Account/User 永続化）と
// Credentials を結合する。Credentials を含むため session 戦略は JWT に強制される。
// ここから export する auth を lib/auth/helpers.ts の requireUser() が利用する。
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [...authConfig.providers, credentialsProvider],
});
