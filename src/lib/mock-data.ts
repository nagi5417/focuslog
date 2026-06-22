import type { Tag, WeekBlock, BlockColor } from "@/types";

export const TASK_COLOR: Record<Tag, BlockColor> = {
  review: "c-blue",
  design: "c-violet",
  backend: "c-emerald",
  docs: "c-amber",
  admin: "c-slate",
  ops: "c-rose",
  research: "c-cyan",
  cs: "c-orange",
};

const rawBlocks = [
  // Mon
  {
    day: 0,
    start: 9 * 60 + 15,
    dur: 75,
    title: "仕様書レビュー",
    tag: "review",
  },
  {
    day: 0,
    start: 10 * 60 + 45,
    dur: 90,
    title: "デザインMTG準備",
    tag: "design",
  },
  {
    day: 0,
    start: 13 * 60 + 30,
    dur: 120,
    title: "API スキーマ実装",
    tag: "backend",
  },
  { day: 0, start: 16 * 60, dur: 45, title: "PRレビュー", tag: "review" },
  { day: 0, start: 17 * 60, dur: 60, title: "リリースノート", tag: "docs" },
  // Tue
  {
    day: 1,
    start: 9 * 60,
    dur: 30,
    title: "デイリースタンドアップ",
    tag: "admin",
  },
  { day: 1, start: 9 * 60 + 45, dur: 105, title: "OAuth 実装", tag: "backend" },
  { day: 1, start: 11 * 60 + 45, dur: 60, title: "デザインMTG", tag: "design" },
  { day: 1, start: 14 * 60, dur: 90, title: "バグ修正 #412", tag: "backend" },
  { day: 1, start: 16 * 60, dur: 60, title: "カスタマー1on1", tag: "cs" },
  { day: 1, start: 17 * 60 + 30, dur: 30, title: "議事録", tag: "docs" },
  // Wed
  {
    day: 2,
    start: 8 * 60 + 30,
    dur: 60,
    title: "メール / 通知整理",
    tag: "admin",
  },
  { day: 2, start: 10 * 60, dur: 90, title: "リサーチ", tag: "research" },
  {
    day: 2,
    start: 13 * 60,
    dur: 75,
    title: "仕様書レビュー (auth)",
    tag: "review",
  },
  {
    day: 2,
    start: 14 * 60 + 30,
    dur: 120,
    title: "API スキーマ実装",
    tag: "backend",
  },
  { day: 2, start: 16 * 60 + 45, dur: 45, title: "Sentry 確認", tag: "ops" },
  // Thu
  { day: 3, start: 9 * 60, dur: 45, title: "週次レポート", tag: "admin" },
  { day: 3, start: 10 * 60, dur: 60, title: "PRレビュー", tag: "review" },
  {
    day: 3,
    start: 11 * 60 + 15,
    dur: 75,
    title: "オンボーディング絵コンテ",
    tag: "design",
  },
  {
    day: 3,
    start: 13 * 60 + 30,
    dur: 90,
    title: "API スキーマ実装",
    tag: "backend",
  },
  {
    day: 3,
    start: 15 * 60 + 15,
    dur: 60,
    title: "競合UI調査",
    tag: "research",
  },
  {
    day: 3,
    start: 16 * 60 + 30,
    dur: 60,
    title: "リリースノート v1.4",
    tag: "docs",
  },
  // Fri
  { day: 4, start: 9 * 60 + 30, dur: 30, title: "デイリー", tag: "admin" },
  {
    day: 4,
    start: 10 * 60 + 15,
    dur: 75,
    title: "デザインMTG準備",
    tag: "design",
  },
  {
    day: 4,
    start: 11 * 60 + 45,
    dur: 30,
    title: "PRレビュー #418",
    tag: "review",
  },
  {
    day: 4,
    start: 13 * 60 + 30,
    dur: 90,
    title: "仕様書レビュー",
    tag: "review",
  },
  // Sat
  { day: 5, start: 14 * 60, dur: 60, title: "個人開発", tag: "research" },
];

export const WEEK_BLOCKS: WeekBlock[] = rawBlocks.map((b) => ({
  ...b,
  color: TASK_COLOR[b.tag as Tag] ?? "c-slate",
}));
