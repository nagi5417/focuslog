import type { DefaultSession } from "next-auth";

// Auth.js v5 の型を拡張し、Session.user.id と JWT.id を型安全に扱えるようにする。
// JWT 戦略では session callback が token から id を引き継ぐため、両方の宣言が必要。
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
