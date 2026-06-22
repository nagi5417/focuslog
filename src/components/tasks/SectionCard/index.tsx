"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function SectionCard({
  title,
  count,
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className="rounded-[10px] border overflow-hidden"
      style={{
        background: "var(--fl-panel)",
        borderColor: "var(--fl-border)",
      }}
    >
      {/* ヘッダー */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-[var(--fl-hover)] transition-colors duration-[80ms]"
      >
        <ChevronDown
          size={14}
          className={cn(
            "text-[var(--fl-text-muted)] transition-transform duration-[380ms]",
            "[cubic-bezier(.4,0,.2,1)]",
            !open && "-rotate-90",
          )}
        />
        <span className="text-[13px] font-[500] tracking-[-0.005em] text-[var(--fl-text)]">
          {title}
        </span>
        <span className="ml-1 inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[10.5px] font-mono text-[var(--fl-text-subtle)] bg-[var(--fl-panel-2)]">
          {count}
        </span>
      </button>

      {/* コンテンツ（grid トリックで高さアニメーション） */}
      <div
        className="grid transition-[grid-template-rows] duration-[380ms]"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[var(--fl-border-subtle)] pb-1">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
