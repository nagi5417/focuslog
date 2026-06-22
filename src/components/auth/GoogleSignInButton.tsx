import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/actions/auth";

// Google OAuth の開始ボタン。form action でサーバーアクションを直接呼ぶだけなので
// 'use client' は不要（Server Component のまま動作する）。送信で Google へリダイレクトされる。
export function GoogleSignInButton() {
  return (
    <form action={signInWithGoogle}>
      <Button variant="outline" type="submit" className="w-full">
        Google で続ける
      </Button>
    </form>
  );
}
