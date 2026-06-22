"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/actions/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";

// パスワード再設定の要求フォーム。列挙攻撃対策で、登録の有無に関わらず常に同じ案内を表示する。
export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    const result = await requestPasswordReset(values);
    if (result.ok) {
      setSubmitted(true);
      return;
    }
    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages[0])
          setError(field as keyof ForgotPasswordInput, {
            message: messages[0],
          });
      }
    }
    toast.error(result.error);
  }

  // 成功状態: メールアドレスの登録有無を漏らさないため、常に同一の案内を表示する。
  if (submitted) {
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>パスワード再設定メールを送信しました（登録済みの場合）。</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">ログインへ戻る</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "送信中..." : "再設定メールを送信"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-foreground hover:underline">
          ログインへ戻る
        </Link>
      </p>
    </form>
  );
}
