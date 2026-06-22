"use client";

import { useTransition } from "react";

import { useTheme } from "next-themes";

import { updateSetting } from "@/lib/actions/setting";

type Theme = "light" | "dark" | "system";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
  { value: "system", label: "システム" },
];

interface Props {
  initialTheme: string;
}

export function ThemeSelector({ initialTheme }: Props) {
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const current = (theme ?? initialTheme) as Theme;

  function handleChange(value: Theme) {
    setTheme(value);
    startTransition(async () => {
      await updateSetting({ theme: value });
    });
  }

  return (
    <div className="flex gap-2" role="group" aria-label="テーマ選択">
      {THEMES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          disabled={isPending}
          aria-pressed={current === value}
          className={[
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            current === value
              ? "border border-[var(--fl-brand)] text-[var(--fl-brand)]"
              : "border border-[var(--fl-border)] text-[var(--fl-text-muted)] hover:bg-[var(--fl-hover)]",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
