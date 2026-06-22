import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GoogleSignInButton, LoginForm } from "@/components/auth";

interface LoginPageProps {
  // Next.js 16: searchParams は Promise。必ず await して取り出す。
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;
  // Google 連携の環境変数が未設定なら OAuth ボタンと divider を出さない。
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>ログインして集中をはじめる</CardTitle>
        <CardDescription>
          メールアドレスまたは Google アカウントでログインしてください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {googleEnabled && (
          <>
            <GoogleSignInButton />
            {/* "または" の divider。左右に区切り線を配置する。 */}
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-muted-foreground text-xs">または</span>
              <Separator className="flex-1" />
            </div>
          </>
        )}
        <LoginForm callbackUrl={sp.callbackUrl} />
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-sm">
          アカウントをお持ちでない方は{" "}
          <Link href="/register" className="text-foreground hover:underline">
            新規登録
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
