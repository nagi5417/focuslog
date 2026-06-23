"use client";

import { signOutAction } from "@/lib/actions/auth";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { Button } from "@/components/ui/button";

type User = {
  name?: string | null;
  email?: string | null;
};

type Props = {
  user: User;
};

function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AccountSettings({ user }: Props) {
  const email = user.email ?? "";

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--fl-text-subtle)]">
          アカウント
        </h2>
        <div className="rounded-[9px] border border-[var(--fl-border)] bg-[var(--fl-panel)]">
          <div className="flex items-center gap-3 border-b border-[var(--fl-border-subtle)] p-4">
            <div className="grid size-[38px] shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#6366f1,#a855f7)] text-[14px] font-semibold text-white">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-[500] text-[var(--fl-text)]">
                {user.name ?? "ユーザー"}
              </div>
              <div className="truncate text-[12px] text-[var(--fl-text-muted)]">
                {email}
              </div>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                ログアウト
              </Button>
            </form>
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-[13.5px] font-[500] text-[var(--fl-text)]">
                タイムゾーン
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--fl-text-muted)]">
                レポートの時刻表示に使われます。
              </div>
            </div>
            <div className="font-mono text-[12px] text-[var(--fl-text)]">
              Asia/Tokyo (UTC+09:00)
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--fl-text-subtle)]">
          データ
        </h2>
        <div className="rounded-[9px] border border-[var(--fl-border)] bg-[var(--fl-panel)]">
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-[13.5px] font-[500] text-[var(--fl-danger)]">
                アカウントを削除
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--fl-text-muted)]">
                全てのタスク・計測ログが削除されます。元に戻せません。
              </div>
            </div>
            <DeleteAccountDialog email={email} />
          </div>
        </div>
      </section>
    </>
  );
}
