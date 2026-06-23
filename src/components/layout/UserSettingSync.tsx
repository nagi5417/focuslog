"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

type Theme = "light" | "dark" | "system";

type Props = {
  theme: Theme;
};

export function UserSettingSync({ theme }: Props) {
  const { theme: currentTheme, setTheme } = useTheme();
  const didSync = useRef(false);

  useEffect(() => {
    if (didSync.current) return;
    didSync.current = true;
    if (currentTheme !== theme) {
      setTheme(theme);
    }
  }, [currentTheme, setTheme, theme]);

  return null;
}
