"use client";

import { createContext, useEffect, useState } from "react";

export type Accent = "green" | "blue" | "orange" | "violet";

const ACCENT_COOKIE = "fl-accent";
// 既定アクセントは blue。:root / .dark のブランドトークン自体も青に揃えてあるため、
// data-accent 属性が無い素の状態でも青になり、緑→青のフラッシュが起きない。
const DEFAULT_ACCENT: Accent = "blue";

export const AccentContext = createContext<{
  accent: Accent;
  setAccent: (accent: Accent) => void;
}>({
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
});

function readCookie(): Accent {
  if (typeof document === "undefined") return DEFAULT_ACCENT;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ACCENT_COOKIE}=([^;]*)`),
  );
  const value = match ? decodeURIComponent(match[1]) : DEFAULT_ACCENT;
  return (["green", "blue", "orange", "violet"] as const).includes(
    value as Accent,
  )
    ? (value as Accent)
    : DEFAULT_ACCENT;
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<Accent>(DEFAULT_ACCENT);

  useEffect(() => {
    // クッキーからアクセントを復元（SSRとのハイドレーション差分を許容する意図的なパターン）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccentState(readCookie());
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (accent === "green") {
      el.removeAttribute("data-accent");
    } else {
      el.setAttribute("data-accent", accent);
    }
    document.cookie = `${ACCENT_COOKIE}=${accent}; path=/; max-age=31536000; SameSite=Lax`;
  }, [accent]);

  return (
    <AccentContext value={{ accent, setAccent: setAccentState }}>
      {children}
    </AccentContext>
  );
}
