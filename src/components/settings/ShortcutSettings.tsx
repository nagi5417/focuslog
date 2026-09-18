"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { updateSetting } from "@/lib/actions/setting";

type ShortcutSettingsProps = {
  initialEnabled: boolean;
};

const TITLE_ID = "shortcut-settings-title";
const DESCRIPTION_ID = "shortcut-settings-description";

/**
 * キーボードショートカットのオン・オフ。
 *
 * 1文字のショートカット（N / F / Space / G R）は、音声入力などで話した言葉に
 * 誤って反応することがあるため、無効にできる手段を用意している（WCAG 2.1.4）。
 */
export function ShortcutSettings({ initialEnabled }: ShortcutSettingsProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    const previous = enabled;
    // 押した瞬間に表示を切り替え、保存に失敗したら元に戻す
    setEnabled(next);
    startTransition(async () => {
      const result = await updateSetting({ shortcutsEnabled: next });
      if (!result.ok) {
        setEnabled(previous);
        toast.error(result.error);
        return;
      }
      // サイドバーの一覧とキー入力の受け付けはレイアウトが描画しているため、
      // レイアウトを取り直してこの場で反映する
      router.refresh();
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <div>
        <h3
          id={TITLE_ID}
          className="text-[13.5px] font-[500] text-[var(--fl-text)]"
        >
          キーボードショートカット
        </h3>
        <p
          id={DESCRIPTION_ID}
          className="mt-0.5 text-[12px] text-[var(--fl-text-muted)]"
        >
          N で新規タスク、F で検索、Space で計測の開始・停止、G → R
          でレポートへ移動します。音声入力などで誤って反応する場合はオフにしてください。
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleChange}
        disabled={isPending}
        aria-labelledby={TITLE_ID}
        aria-describedby={DESCRIPTION_ID}
        className="mt-0.5"
      />
    </div>
  );
}
