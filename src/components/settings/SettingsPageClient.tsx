"use client";

import { AccountSettings } from "@/components/settings/AccountSettings";
import { AccentSelector } from "@/components/settings/AccentSelector";
import { ThemeSelector } from "@/components/settings/ThemeSelector";

type User = {
  name?: string | null;
  email?: string | null;
};

type Props = {
  setting: {
    theme: string;
    accent: string;
  };
  user: User;
};

export function SettingsPageClient({ setting, user }: Props) {
  return (
    <div className="flex h-full flex-col overflow-auto">
      <div
        className="shrink-0 border-b px-7 pb-4 pt-5"
        style={{ borderColor: "var(--fl-border)" }}
      >
        <h1 className="text-[18px] font-[600] text-[var(--fl-text)]">設定</h1>
      </div>

      <div className="flex max-w-[720px] flex-col gap-7 px-7 py-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--fl-text-subtle)]">
            外観
          </h2>
          <div className="rounded-[9px] border border-[var(--fl-border)] bg-[var(--fl-panel)]">
            <div className="flex flex-col gap-3 border-b border-[var(--fl-border-subtle)] p-4">
              <div>
                <h3 className="text-[13.5px] font-[500] text-[var(--fl-text)]">
                  テーマ
                </h3>
                <p className="mt-0.5 text-[12px] text-[var(--fl-text-muted)]">
                  OSの設定に合わせるか、Light / Dark を固定できます。
                </p>
              </div>
              <ThemeSelector initialTheme={setting.theme} />
            </div>
            <div className="flex flex-col gap-3 p-4">
              <div>
                <h3 className="text-[13.5px] font-[500] text-[var(--fl-text)]">
                  アクセントカラー
                </h3>
                <p className="mt-0.5 text-[12px] text-[var(--fl-text-muted)]">
                  ボタンや計測中表示に使う色を選べます。
                </p>
              </div>
              <AccentSelector />
            </div>
          </div>
        </section>

        <AccountSettings user={user} />

        <div className="h-8" />
      </div>
    </div>
  );
}
