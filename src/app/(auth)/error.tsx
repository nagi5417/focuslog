"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AuthErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// (auth) セグメント用の最小エラーバウンダリ。想定外エラー時に再試行手段を提供する。
export default function AuthError({ error, reset }: AuthErrorProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>問題が発生しました</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          {error.message || "予期しないエラーが発生しました。"}
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={reset} className="w-full">
          再試行
        </Button>
      </CardFooter>
    </Card>
  );
}
