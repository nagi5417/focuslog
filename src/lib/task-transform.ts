import type { Task, Priority, Section, TaskStatus } from "@/types/task";

/**
 * Prisma の Task（timeEntries 同梱）→ フロントの「生値」Task への変換と、
 * 表示ラベルを算出するセレクタ群を集約する。
 *
 * Server Action（lib/actions/task.ts）と Server Component（app/(app)/tasks/page.tsx）の
 * 双方で同一の変換が必要なため共通化している。"use server" を付けないことで
 * 同期ヘルパーを export できる（Server Action ファイルは async 関数しか export できない）。
 *
 * 「今」はクライアントで new Date() せず、Server Component で確定した nowMs を
 * 各セレクタに渡す（ハイドレーション一致・JST 一貫・テスト容易のため）。
 */

const JST_OFFSET = 9 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// JST 基準で「今日の始まり（00:00:00.000）」を返す（nowMs = サーバー確定の現在時刻）
export function jstStartOfToday(nowMs: number): Date {
  const jstNow = new Date(nowMs + JST_OFFSET);
  const startOfDay = new Date(
    Date.UTC(
      jstNow.getUTCFullYear(),
      jstNow.getUTCMonth(),
      jstNow.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  return new Date(startOfDay.getTime() - JST_OFFSET);
}

// JST 基準で「今日の終わり（23:59:59.999）」を返す
export function jstEndOfToday(nowMs: number): Date {
  const jstNow = new Date(nowMs + JST_OFFSET);
  const endOfDay = new Date(
    Date.UTC(
      jstNow.getUTCFullYear(),
      jstNow.getUTCMonth(),
      jstNow.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
  return new Date(endOfDay.getTime() - JST_OFFSET);
}

// 期限の相対表示（"今日" / "明日" / "M/dd" / ""）。nowMs 基準で判定
export function formatDue(dueDate: string | null, nowMs: number): string {
  if (!dueDate) return "";
  const today = jstStartOfToday(nowMs);
  const tomorrow = new Date(today.getTime() + ONE_DAY_MS);
  const dayAfter = new Date(tomorrow.getTime() + ONE_DAY_MS);
  const due = new Date(dueDate);

  if (due >= today && due < tomorrow) return "今日";
  if (due >= tomorrow && due < dayAfter) return "明日";

  const jstDue = new Date(due.getTime() + JST_OFFSET);
  return `${jstDue.getUTCMonth() + 1}/${String(jstDue.getUTCDate()).padStart(2, "0")}`;
}

// 今日以前（期限切れ含む）を today に入れる（明日以降・期限なしは other）
export function toSection(dueDate: string | null, nowMs: number): Section {
  if (!dueDate) return "other";
  return new Date(dueDate) <= jstEndOfToday(nowMs) ? "today" : "other";
}

// 期限切れ判定: 昨日以前が期限で、かつ未完了のもの（完了済みは強調しない）
export function isOverdue(
  dueDate: string | null,
  done: boolean,
  nowMs: number,
): boolean {
  if (!dueDate || done) return false;
  return new Date(dueDate) < jstStartOfToday(nowMs);
}

// priority(0-3) → 表示用 Priority。createTask 側の閾値と整合させる
export function toPriorityLabel(priority: number): Priority {
  if (priority >= 3) return "high";
  if (priority === 2) return "mid";
  return "low";
}

// status → 完了フラグ
export function isDone(status: TaskStatus): boolean {
  return status === "DONE";
}

export type PrismaTaskWithEntries = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: number;
  dueDate: Date | null;
  createdAt: Date;
  timeEntries: { durationSec: number | null }[];
  project?: { id: string; name: string; color: string | null } | null;
  tagLinks?: {
    tag: { id: string; name: string; color: string | null };
  }[];
};

// Prisma の Task → フロントの生値 Task。表示ラベルは持たせない（表示時にセレクタで算出）
export function toFrontTask(t: PrismaTaskWithEntries): Task {
  const elapsed = t.timeEntries.reduce(
    (sum, e) => sum + (e.durationSec ?? 0),
    0,
  );
  return {
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    elapsed,
    project: t.project
      ? { id: t.project.id, name: t.project.name, color: t.project.color }
      : null,
    tags:
      t.tagLinks?.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })) ?? [],
  };
}
