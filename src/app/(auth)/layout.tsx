import type { PropsWithChildren } from "react";

// 認証ページ共通シェル。背景と中央寄せのみ担当し、Card 等の中身は各ページに委ねる。
export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      {children}
    </div>
  );
}
