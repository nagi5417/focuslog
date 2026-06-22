import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth";

interface ResetPasswordPageProps {
  // Next.js 16: searchParams は Promise。await して token を取り出す。
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const sp = await searchParams;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>新しいパスワードを設定</CardTitle>
        <CardDescription>
          新しいパスワードを入力して再設定を完了してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* token 不在時はフォーム側で無効リンクの案内を表示する。 */}
        <ResetPasswordForm token={sp.token ?? ""} />
      </CardContent>
    </Card>
  );
}
