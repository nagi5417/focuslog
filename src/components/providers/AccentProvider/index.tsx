"use client";

import { createContext, useEffect, useRef, useState } from "react";

export type Accent = "green" | "blue" | "yellow" | "orange" | "violet";

const ACCENT_COOKIE = "fl-accent";
const DEFAULT_ACCENT: Accent = "blue";

export const AccentContext = createContext<{
  accent: Accent;
  setAccent: (accent: Accent) => void;
}>({
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
});

export function AccentProvider({
  children,
  initialAccent = DEFAULT_ACCENT,
}: {
  children: React.ReactNode;
  initialAccent?: Accent;
}) {
  const [accent, setAccentState] = useState<Accent>(initialAccent);
  const didMount = useRef(false);

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-accent", accent);
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    document.cookie = `${ACCENT_COOKIE}=${accent}; path=/; max-age=31536000; SameSite=Lax`;
  }, [accent]);

  return (
    <AccentContext value={{ accent, setAccent: setAccentState }}>
      {children}
    </AccentContext>
  );
}
