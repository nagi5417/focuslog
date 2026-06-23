"use client";

import { useContext, useState } from "react";

import {
  AccentContext,
  type Accent,
} from "@/components/providers/AccentProvider";
import { updateSetting } from "@/lib/actions/setting";
import { cn } from "@/lib/utils";

// 既定色の blue を先頭に。以降は green → yellow → orange → violet の固定順で揃える。
const ACCENTS: { value: Accent; label: string; className: string }[] = [
  { value: "blue", label: "Blue", className: "bg-blue-500" },
  { value: "green", label: "Green", className: "bg-emerald-500" },
  { value: "yellow", label: "Yellow", className: "bg-yellow-400" },
  { value: "orange", label: "Orange", className: "bg-orange-500" },
  { value: "violet", label: "Violet", className: "bg-violet-500" },
];

function isAccent(value: string): value is Accent {
  return ACCENTS.some((accent) => accent.value === value);
}

export function AccentSelector() {
  const { accent, setAccent } = useContext(AccentContext);
  const [savingAccent, setSavingAccent] = useState<Accent | null>(null);
  const current = isAccent(accent) ? accent : "blue";

  async function handleChange(value: Accent) {
    if (savingAccent) return;
    const previous = current;
    setAccent(value);
    setSavingAccent(value);

    const result = await updateSetting({ accent: value });
    if (!result.ok) {
      setAccent(previous);
    }
    setSavingAccent(null);
  }

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-5"
      role="group"
      aria-label="アクセントカラー選択"
    >
      {ACCENTS.map(({ value, label, className }) => (
        <button
          key={value}
          type="button"
          onClick={() => handleChange(value)}
          disabled={savingAccent !== null}
          aria-pressed={current === value}
          className={cn(
            "flex h-9 items-center justify-center gap-2 rounded-[7px] border px-2 text-[12px] font-[500] transition-colors disabled:opacity-50",
            current === value
              ? "border-[var(--fl-brand)] bg-[var(--fl-brand-ghost)] text-[var(--fl-text)]"
              : "border-[var(--fl-border)] text-[var(--fl-text-muted)] hover:bg-[var(--fl-hover)]",
          )}
        >
          <span className={cn("size-2.5 rounded-full", className)} />
          {label}
        </button>
      ))}
    </div>
  );
}
