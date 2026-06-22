"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register as registerAction } from "@/lib/actions/auth";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

// 新規登録フォーム。送信成功後はフォームを隠し、確認メールの案内に切り替える（submitted フラグ）。
// 列挙攻撃対策のため、サーバーは既存メールでも成功を返す点に注意（常に同じ案内になる）。
export function RegisterForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    const result = await registerAction(values);
    if (result.ok) {
      setSubmitted(true);
      return;
    }
    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages[0])
          setError(field as keyof RegisterInput, { message: messages[0] });
      }
    }
    toast.error(result.error);
  }

  // 成功状態: フォームを消して確認メールの案内を表示する。
  if (submitted) {
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          確認メールを送信しました。メール内（開発時はサーバーコンソール）のリンクから確認してください。
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">ログインへ戻る</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">名前</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>
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
      <div className="space-y-1.5">
        <Label htmlFor="password">パスワード</Label>
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
        {isSubmitting ? "登録中..." : "アカウントを作成"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        すでにアカウントをお持ちですか？{" "}
        <Link href="/login" className="text-foreground hover:underline">
          ログイン
        </Link>
      </p>
    </form>
  );
}
