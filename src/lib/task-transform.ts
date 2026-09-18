import type {
  DueBucket,
  Priority,
  Section,
  Task,
  TaskStatus,
} from "@/types/task";

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

// 期限だけでタスクを分類する（完了状態は見ない）。
// ヘッダーの件数集計は「完了済みも含めて今日期限が何件か」を数えるため、
// 表示セクション（toSection）とは別にこちらを使う。
export function toDueBucket(dueDate: string | null, nowMs: number): DueBucket {
  if (!dueDate) return "undated";
  const due = new Date(dueDate);
  if (due < jstStartOfToday(nowMs)) return "overdue";
  if (due <= jstEndOfToday(nowMs)) return "today";
  return "upcoming";
}

// 一覧の表示セクション。完了していれば期限に関係なく done に入れる。
// セクションを保存せず status と dueDate から都度算出することで、
// 「完了したら移動」「戻したら元のセクションへ戻る」が自動的に成立する。
export function toSection(
  dueDate: string | null,
  status: TaskStatus,
  nowMs: number,
): Section {
  return isDone(status) ? "done" : toDueBucket(dueDate, nowMs);
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

// 未完了セクションの並び順: 期限の近い順 → 優先度の高い順 → 作成日の新しい順。
// 期限なしは末尾に送る（日付未設定セクション内では実質すべて同値になり優先度順で並ぶ）。
export function compareByDue(a: Task, b: Task): number {
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (diff !== 0) return diff;
  }
  if (a.priority !== b.priority) return b.priority - a.priority;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// 完了セクションの並び順: 完了日時の新しい順。
// completedAt が無い過去データは createdAt で代替する。
export function compareByCompletedAt(a: Task, b: Task): number {
  const at = new Date(a.completedAt ?? a.createdAt).getTime();
  const bt = new Date(b.completedAt ?? b.createdAt).getTime();
  return bt - at;
}

// 全タスクを5セクションへ振り分け、各セクションを上記の規則でソートして返す。
export function groupBySection(
  tasks: Task[],
  nowMs: number,
): Record<Section, Task[]> {
  const groups: Record<Section, Task[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    undated: [],
    done: [],
  };
  for (const task of tasks) {
    groups[toSection(task.dueDate, task.status, nowMs)].push(task);
  }
  for (const key of Object.keys(groups) as Section[]) {
    groups[key].sort(key === "done" ? compareByCompletedAt : compareByDue);
  }
  return groups;
}

export type PrismaTaskWithEntries = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: number;
  dueDate: Date | null;
  createdAt: Date;
  // 既存の呼び出し・テストを壊さないよう任意にする（未指定なら null 扱い）
  completedAt?: Date | null;
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
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
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
