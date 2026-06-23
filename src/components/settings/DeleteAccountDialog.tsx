"use client";

import { useState, useTransition } from "react";

import { deleteAccountAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  email: string;
};

export function DeleteAccountDialog({ email }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canDelete = confirmEmail === email && !isPending;

  function handleDelete() {
    startTransition(async () => {
      setError(null);
      const result = await deleteAccountAction({ email: confirmEmail });
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-[var(--fl-danger)]">
          削除
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>アカウントを削除しますか？</DialogTitle>
          <DialogDescription>
            全てのタスク、タグ、プロジェクト、計測ログが削除されます。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-account-email">
            確認のためメールアドレスを入力してください
          </Label>
          <Input
            id="delete-account-email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={email}
            disabled={isPending}
          />
          {error && (
            <p className="text-sm text-[var(--fl-danger)]" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button type="button" onClick={handleDelete} disabled={!canDelete}>
            {isPending ? "削除中…" : "完全に削除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
