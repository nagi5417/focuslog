"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/actions/auth";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

interface ResetPasswordFormProps {
  token: string;
}

// パスワード再設定フォーム。token は URL クエリ由来で props から受け取り、送信値に同梱する。
// token が空ならリンク自体が無効なため、フォームを出さず案内のみ表示する。
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    const result = await resetPassword(values);
    if (result.ok) {
      toast.success("パスワードを再設定しました");
      router.push("/login");
      return;
    }
    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages[0])
          setError(field as keyof ResetPasswordInput, { message: messages[0] });
      }
    }
    toast.error(result.error);
  }

  // token 不在: 無効リンクとして案内のみ表示する。
  if (!token) {
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p className="text-destructive">リンクが無効です。</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">再設定メールを再送する</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* token は hidden で RHF に登録済み（defaultValues）。送信値に確実に含める。 */}
      <input type="hidden" {...register("token")} />
      <div className="space-y-1.5">
        <Label htmlFor="password">新しいパスワード</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "更新中..." : "パスワードを再設定"}
      </Button>
    </form>
  );
}
