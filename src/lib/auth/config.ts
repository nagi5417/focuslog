import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// proxy と auth.ts の両方が共有する「軽量」設定。
// Prisma / bcrypt / PrismaAdapter はここでは import しない（proxy に Node 専用依存を持ち込まないため）。
// Google の clientId/secret は環境変数 AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET から自動推論される。
export const authConfig: NextAuthConfig = {
  providers: [Google],
  // Credentials を併用するため JWT 戦略が必須（DB セッションは使えない）。
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // ローカル/セルフホストでホスト検証を通すために必要。
  trustHost: true,
  callbacks: {
    // bare middleware として使う場合のルート保護。proxy.ts では明示制御するため最小限。
    authorized({ auth }) {
      return !!auth?.user;
    },
    // user は signIn/signUp 時のみ渡る。id を JWT に載せて以降のリクエストへ引き継ぐ。
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // JWT 戦略では session に user は来ないため、token から id を復元する。
    // token は index 型のため、typeof で string に絞ってから代入する。
    session({ session, token }) {
      if (typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
};
