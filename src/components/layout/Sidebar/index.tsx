"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/layout/BrandMark";
import { useTimerStore } from "@/stores/timer-store";

type User = { name?: string | null; email?: string | null };

const NAV_ITEMS = [
  { href: "/tasks", label: "タスク", icon: List },
  { href: "/reports", label: "レポート", icon: BarChart3 },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

const SHORTCUTS = [
  { label: "新規タスク", key: "N" },
  { label: "計測 開始 / 停止", key: "Space" },
  { label: "レポートへ", key: "G R" },
] as const;

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Sidebar({
  user,
  todayTaskCount,
  hasActiveTimer,
}: {
  user?: User;
  todayTaskCount: number;
  hasActiveTimer: boolean;
}) {
  const pathname = usePathname();
  const runningTaskId = useTimerStore((state) => state.runningTaskId);
  const stopSeq = useTimerStore((state) => state.stopSeq);
  const showActiveTimer = Boolean(runningTaskId) || (hasActiveTimer && stopSeq === 0);

  return (
    <aside
      className="flex flex-1 flex-col min-h-0 border-r"
      style={{ background: "var(--fl-panel)", borderColor: "var(--fl-border)" }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-[9px] px-[18px] py-[16px] pb-[14px] border-b"
        style={{ borderColor: "var(--fl-border-subtle)" }}
      >
        <BrandMark />
        <span
          className="font-semibold text-[14px] tracking-[-0.02em]"
          style={{ color: "var(--fl-text)" }}
        >
          focuslog
        </span>
        <span
          className="ml-auto font-mono text-[9.5px] tracking-[0.08em] uppercase px-[6px] py-[2px] rounded-[4px] border"
          style={{
            color: "var(--fl-text-subtle)",
            borderColor: "var(--fl-border)",
          }}
        >
          v1.1
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-[2px] px-[10px] py-[12px] flex-1 min-h-0">
        <span
          className="font-mono text-[10px] tracking-[0.08em] uppercase px-[10px] pb-[6px] pt-[8px]"
          style={{ color: "var(--fl-text-subtle)" }}
        >
          Workspace
        </span>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-[10px] px-[10px] py-[7px] rounded-[6px] text-[13px] font-[450] transition-colors duration-[80ms]",
                isActive ? "font-[500]" : "hover:bg-[var(--fl-hover)]",
              )}
              style={{
                background: isActive ? "var(--fl-hover)" : undefined,
                color: isActive ? "var(--fl-text)" : "var(--fl-text-2)",
              }}
            >
              {isActive && (
                <span
                  className="absolute -left-[10px] top-1/2 -translate-y-1/2 w-[2px] h-[16px] rounded-[2px]"
                  style={{ background: "var(--fl-brand)" }}
                />
              )}
              <Icon
                size={15}
                style={{
                  color: isActive ? "var(--fl-brand)" : "var(--fl-text-muted)",
                }}
              />
              <span>{label}</span>
              {href === "/tasks" && (
                <span
                  className="ml-auto rounded-[999px] px-[6px] py-[1px] font-mono text-[10px]"
                  style={{
                    background: isActive
                      ? "var(--fl-brand-ghost)"
                      : "var(--fl-panel-2)",
                    color: isActive
                      ? "var(--fl-brand)"
                      : "var(--fl-text-subtle)",
                  }}
                >
                  {todayTaskCount}
                </span>
              )}
              {href === "/reports" && showActiveTimer && (
                <span
                  className="ml-auto inline-flex items-center gap-[4px] rounded-[999px] px-[6px] py-[1px] font-mono text-[10px]"
                  style={{
                    background: isActive
                      ? "var(--fl-brand-ghost)"
                      : "var(--fl-panel-2)",
                    color: isActive
                      ? "var(--fl-brand)"
                      : "var(--fl-text-subtle)",
                  }}
                >
                  <span
                    className="size-[5px] rounded-full"
                    style={{ background: "var(--fl-brand)" }}
                  />
                  LIVE
                </span>
              )}
            </Link>
          );
        })}

        {/* Shortcuts */}
        <span
          className="font-mono text-[10px] tracking-[0.08em] uppercase px-[10px] pb-[6px] pt-[8px] mt-[10px]"
          style={{ color: "var(--fl-text-subtle)" }}
        >
          Shortcuts
        </span>
        <div className="flex flex-col gap-[8px] px-[10px]">
          {SHORTCUTS.map(({ label, key }) => (
            <div
              key={key}
              className="flex justify-between items-center text-[11.5px]"
              style={{ color: "var(--fl-text-muted)" }}
            >
              <span>{label}</span>
              <kbd
                className="font-mono text-[10.5px] px-[5px] py-[1px] rounded-[4px] border border-b-2"
                style={{
                  background: "var(--fl-panel-2)",
                  borderColor: "var(--fl-border)",
                  color: "var(--fl-text-muted)",
                }}
              >
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="flex items-center gap-[10px] px-[12px] py-[10px] border-t"
        style={{ borderColor: "var(--fl-border-subtle)" }}
      >
        <div
          className="w-[26px] h-[26px] rounded-full grid place-items-center text-[11px] font-semibold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
        >
          {initials(user?.name)}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="text-[12px] font-[500] truncate"
            style={{ color: "var(--fl-text)" }}
          >
            {user?.name ?? "ゲスト"}
          </span>
          <span
            className="text-[10.5px] truncate"
            style={{ color: "var(--fl-text-subtle)" }}
          >
            {user?.email ?? ""}
          </span>
        </div>
        <Link
          href="/settings"
          className="w-[26px] h-[26px] grid place-items-center rounded-[6px] transition-colors hover:bg-[var(--fl-hover)]"
        >
          <Settings size={13} style={{ color: "var(--fl-text-muted)" }} />
        </Link>
      </div>
    </aside>
  );
}
