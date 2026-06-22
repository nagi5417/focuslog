"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
} from "lucide-react";

import { getTimeEntriesForWeek } from "@/lib/actions/log";
import {
  jstStartOfWeek,
  getNowMinJst,
  weekDateAt,
  todayWeekIdx,
} from "@/lib/utils/date";
import { StatCard } from "./StatCard";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { EditPopover } from "./EditPopover";
import type { TimeEntryBlock } from "@/types/report";

type Props = {
  initialEntries: TimeEntryBlock[];
};

export function ReportsPageClient({ initialEntries }: Props) {
  const [view, setView] = useState<"week" | "day">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayIdx, setDayIdx] = useState(() => todayWeekIdx());
  const [entries, setEntries] = useState(initialEntries);
  const [selected, setSelected] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState<TimeEntryBlock | null>(null);
  const [nowMin, setNowMin] = useState(() => getNowMinJst());

  // 1分ごとに Now Line を更新
  useEffect(() => {
    const id = setInterval(() => setNowMin(getNowMinJst()), 60_000);
    return () => clearInterval(id);
  }, []);

  // 週の開始日（UTC）と表示用日付配列（JST）
  const { weekDates } = useMemo(() => {
    const base = jstStartOfWeek(new Date());
    const ws = new Date(base.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);
    const dates = Array.from({ length: 7 }, (_, i) => weekDateAt(ws, i));
    return { weekDates: dates };
  }, [weekOffset]);

  const currentTodayIdx = todayWeekIdx();

  // 週ナビゲーション
  async function handleWeekNav(delta: number) {
    const next = weekOffset + delta;
    setWeekOffset(next);
    const base = jstStartOfWeek(new Date());
    const ws = new Date(base.getTime() + next * 7 * 24 * 60 * 60 * 1000);
    const fresh = await getTimeEntriesForWeek(ws);
    setEntries(fresh);
    closePopover();
  }

  // 今日に戻る
  async function handleToday() {
    setWeekOffset(0);
    setDayIdx(currentTodayIdx);
    const ws = jstStartOfWeek(new Date());
    const fresh = await getTimeEntriesForWeek(ws);
    setEntries(fresh);
    closePopover();
  }

  // 日ビューナビゲーション
  async function handleDayNav(delta: number) {
    const next = dayIdx + delta;
    if (next < 0 || next > 6) {
      const newWeekOffset = weekOffset + (next < 0 ? -1 : 1);
      const newDayIdx = next < 0 ? 6 : 0;
      setWeekOffset(newWeekOffset);
      setDayIdx(newDayIdx);
      const base = jstStartOfWeek(new Date());
      const ws = new Date(
        base.getTime() + newWeekOffset * 7 * 24 * 60 * 60 * 1000,
      );
      const fresh = await getTimeEntriesForWeek(ws);
      setEntries(fresh);
    } else {
      setDayIdx(next);
    }
    closePopover();
  }

  function handleSelectBlock(
    id: string,
    block: TimeEntryBlock,
    el: HTMLDivElement,
  ) {
    setSelected(id);
    setAnchor(el);
    setEditing(block);
  }

  function handleSave(updated: TimeEntryBlock) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function closePopover() {
    setSelected(null);
    setAnchor(null);
    setEditing(null);
  }

  // 統計
  const totalSec = entries.reduce((s, b) => s + b.dur * 60, 0);
  const dailyHours = Array.from({ length: 7 }, (_, i) =>
    entries.filter((b) => b.day === i).reduce((s, b) => s + b.dur / 60, 0),
  );
  const workingDays = dailyHours.filter((h) => h > 0).length || 1;
  const avgHours = (totalSec / 3600 / workingDays).toFixed(1);

  // レンジラベル
  const rangeLabel = useMemo(() => {
    const DAYS_JP = ["月", "火", "水", "木", "金", "土", "日"];
    if (view === "week") {
      const mon = weekDates[0];
      const sun = weekDates[6];
      return `${mon.getUTCMonth() + 1}月${mon.getUTCDate()}日 – ${sun.getUTCMonth() + 1}月${sun.getUTCDate()}日`;
    }
    const d = weekDates[dayIdx];
    return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日 (${DAYS_JP[dayIdx]})`;
  }, [view, weekDates, dayIdx]);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      onClick={closePopover}
    >
      {/* ページヘッダー */}
      <div
        className="flex items-start justify-between px-7 pt-5 pb-4 border-b shrink-0"
        style={{ borderColor: "var(--fl-border)" }}
      >
        <div>
          <h1 className="flex items-baseline gap-2 text-[18px] font-[600] tracking-[-0.02em] text-[var(--fl-text)]">
            レポート
            <span className="text-[12px] font-[400] text-[var(--fl-text-subtle)] tracking-normal">
              単一タスク計測 · ブロック表示
            </span>
          </h1>
          <p className="mt-0.5 text-[12px] text-[var(--fl-text-muted)]">
            集中時間の可視化とリアルタイム計測ログ。ブロックをクリックで時刻編集。
          </p>
        </div>
      </div>

      {/* スクロール領域 */}
      <div className="flex-1 overflow-y-auto">
        {/* ツールバー */}
        <div className="reports-toolbar" onClick={(e) => e.stopPropagation()}>
          <div className="tabs">
            <button
              className={`tab${view === "week" ? " active" : ""}`}
              onClick={() => setView("week")}
            >
              <Calendar size={13} />
              週ビュー
            </button>
            <button
              className={`tab${view === "day" ? " active" : ""}`}
              onClick={() => setView("day")}
            >
              <Clock size={13} />
              日ビュー
            </button>
          </div>

          <div className="range-nav">
            <button
              onClick={() =>
                view === "week" ? handleWeekNav(-1) : handleDayNav(-1)
              }
            >
              <ChevronLeft size={14} />
            </button>
            <div className="range-label">{rangeLabel}</div>
            <button
              onClick={() =>
                view === "week" ? handleWeekNav(1) : handleDayNav(1)
              }
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="flex items-center h-[28px] px-3 rounded-[6px] border text-[12px] font-[500] cursor-pointer hover:bg-[var(--fl-hover)] transition-colors duration-[80ms]"
            style={{
              borderColor: "var(--fl-border)",
              color: "var(--fl-text-muted)",
              background: "transparent",
            }}
          >
            今日
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              className="flex items-center gap-1.5 h-[28px] px-3 rounded-[6px] border text-[12px] font-[500] cursor-pointer hover:bg-[var(--fl-hover)] transition-colors duration-[80ms]"
              style={{
                borderColor: "var(--fl-border)",
                color: "var(--fl-text-muted)",
                background: "transparent",
              }}
            >
              <Filter size={13} />
              絞り込み
            </button>
          </div>
        </div>

        {/* 統計カード */}
        <div
          className="stats-grid stats-grid-2"
          onClick={(e) => e.stopPropagation()}
        >
          <StatCard
            label="今週の合計"
            value={(totalSec / 3600).toFixed(1)}
            unit="h"
            spark={dailyHours}
          />
          <StatCard
            label="1日平均"
            value={avgHours}
            unit="h"
            delta={`平日 ${workingDays} 日平均`}
            deltaDir="up"
            spark={dailyHours}
          />
        </div>

        {/* ビュー本体 */}
        <div style={{ position: "relative" }}>
          {view === "week" ? (
            <WeekView
              blocks={entries}
              todayIdx={weekOffset === 0 ? currentTodayIdx : -1}
              nowMin={nowMin}
              weekDates={weekDates}
              selected={selected}
              onSelectBlock={handleSelectBlock}
            />
          ) : (
            <DayView
              blocks={entries}
              dayIdx={dayIdx}
              nowMin={nowMin}
              selected={selected}
              onSelectBlock={handleSelectBlock}
            />
          )}

          {editing && anchor && (
            <EditPopover
              block={editing}
              anchor={anchor}
              onClose={closePopover}
              onSave={handleSave}
            />
          )}
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
