export type Priority = "high" | "mid" | "low";
export type Section = "today" | "other";

export type Tag =
  | "review"
  | "design"
  | "backend"
  | "docs"
  | "admin"
  | "ops"
  | "research"
  | "cs";

export type ProjectSummary = {
  id: string;
  name: string;
  color: string | null;
};

export type TagSummary = {
  id: string;
  name: string;
  color: string | null;
};

export type TaskClassificationOptions = {
  projects: ProjectSummary[];
  tags: TagSummary[];
};

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

/**
 * フロントが扱う「生値」ベースの Task。
 * 表示用ラベル（優先度・期限表示・セクション・期限切れ・完了）は持たせず、
 * 表示時に task-transform のセレクタ（nowMs 引数）で算出する。
 * 時刻依存の判定に使う「今」は Server Component で確定し props で渡す。
 */
export type Task = {
  id: string;
  title: string;
  priority: number; // 0-3（生値）
  status: TaskStatus; // 生値（done は status === "DONE" で算出）
  dueDate: string | null; // ISO 文字列（Date は props 越えでシリアライズされるため文字列で保持）
  createdAt: string; // ISO 文字列
  elapsed: number; // 完了済み TimeEntry.durationSec の合計（サーバー集計値）
  project: ProjectSummary | null;
  tags: TagSummary[];
};
