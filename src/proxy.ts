import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/config";

// Next.js 16 では middleware.ts は廃止され proxy.ts に置き換わった（Node.js ランタイム固定）。
// config.ts のみから軽量な NextAuth インスタンスを作り、Prisma/bcrypt を持ち込まずに JWT を検証する。
const { auth } = NextAuth(authConfig);

// 認証関連ページ（未認証でも閲覧可、認証済みなら /tasks へ退避）。
const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth?.user;
  const isAuthPage = AUTH_PAGES.some((path) =>
    nextUrl.pathname.startsWith(path),
  );

  // 認証ページの分岐を先頭に置き、リダイレクトループを防ぐ。
  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/tasks", nextUrl));
    }
    return NextResponse.next();
  }

  // 保護領域へ未認証でアクセスした場合は callbackUrl 付きでログインへ。
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// api（Auth.js コールバック）と静的アセットは proxy 対象外にする。
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
