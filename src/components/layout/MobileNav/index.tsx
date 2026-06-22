"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, BarChart3, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/tasks", label: "タスク", icon: List },
  { href: "/reports", label: "レポート", icon: BarChart3 },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="grid grid-cols-3 border-t"
      style={{ background: "var(--fl-panel)", borderColor: "var(--fl-border)" }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-[2px] py-[10px] font-mono text-[10px] tracking-[0.05em] uppercase transition-colors"
            style={{
              color: isActive ? "var(--fl-brand)" : "var(--fl-text-muted)",
            }}
          >
            <Icon
              size={18}
              style={{
                color: isActive ? "var(--fl-brand)" : "var(--fl-text-muted)",
              }}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
