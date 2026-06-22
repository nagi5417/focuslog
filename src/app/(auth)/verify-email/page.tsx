import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/actions/auth";

interface VerifyEmailPageProps {
  // Next.js 16: searchParams は Promise。必ず await する。
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const sp = await searchParams;
  const token = sp.token;

  // token が無い場合は確認を促す案内のみ表示する（登録直後の着地点）。
  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>メールアドレスの確認</CardTitle>
          <CardDescription>
            確認メールを送信しました。メールのリンクから確認してください。
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">ログインへ戻る</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // token がある場合はサーバー側でそのまま検証する（Server Component 内で await 可能）。
  const result = await verifyEmail(token);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {result.ok ? "メールアドレスを確認しました" : "確認に失敗しました"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          {result.ok ? "ログインして focuslog を始めましょう。" : result.error}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href="/login">ログインへ</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
