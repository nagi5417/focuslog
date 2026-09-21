import { describe, it, expect } from "vitest";
import {
  compareByCompletedAt,
  compareByDue,
  formatDue,
  groupBySection,
  isDone,
  isOverdue,
  isStartedToday,
  toDueBucket,
  toFrontTask,
  toPriorityLabel,
  toSection,
} from "@/lib/task-transform";
import type { Task } from "@/types/task";

// JST 2026-06-13 12:00 = UTC 2026-06-13 03:00（テストの「今」を固定）
const NOW_MS = Date.UTC(2026, 5, 13, 3, 0, 0, 0);

// 指定 UTC 日時の ISO 文字列を作る（月は 1 始まりで受ける）
const iso = (y: number, mo: number, d: number, h = 1, mi = 0) =>
  new Date(Date.UTC(y, mo - 1, d, h, mi, 0, 0)).toISOString();

describe("toPriorityLabel", () => {
  it("0/1 は low、2 は mid、3 は high", () => {
    expect(toPriorityLabel(0)).toBe("low");
    expect(toPriorityLabel(1)).toBe("low");
    expect(toPriorityLabel(2)).toBe("mid");
    expect(toPriorityLabel(3)).toBe("high");
  });
});

describe("isDone", () => {
  it("status が DONE のときのみ true", () => {
    expect(isDone("DONE")).toBe(true);
    expect(isDone("TODO")).toBe(false);
    expect(isDone("IN_PROGRESS")).toBe(false);
  });
});

describe("toDueBucket（nowMs 固定）", () => {
  it("昨日以前は overdue、今日は today、明日以降は upcoming、期限なしは undated", () => {
    expect(toDueBucket(iso(2026, 6, 12), NOW_MS)).toBe("overdue"); // 昨日
    expect(toDueBucket(iso(2026, 6, 13), NOW_MS)).toBe("today"); // 今日
    expect(toDueBucket(iso(2026, 6, 14), NOW_MS)).toBe("upcoming"); // 明日
    expect(toDueBucket(null, NOW_MS)).toBe("undated");
  });

  it("JST の日付境界で切り替わる", () => {
    // JST 2026-06-13 00:00 = UTC 2026-06-12 15:00
    expect(toDueBucket(iso(2026, 6, 12, 15, 0), NOW_MS)).toBe("today");
    // JST 2026-06-12 23:59 = UTC 2026-06-12 14:59（前日なので期限切れ）
    expect(toDueBucket(iso(2026, 6, 12, 14, 59), NOW_MS)).toBe("overdue");
    // JST 2026-06-13 23:59 = UTC 2026-06-13 14:59（今日の終わり）
    expect(toDueBucket(iso(2026, 6, 13, 14, 59), NOW_MS)).toBe("today");
    // JST 2026-06-14 00:00 = UTC 2026-06-13 15:00（翌日）
    expect(toDueBucket(iso(2026, 6, 13, 15, 0), NOW_MS)).toBe("upcoming");
  });
});

describe("toSection（nowMs 固定）", () => {
  it("完了していれば期限に関係なく done", () => {
    expect(toSection(iso(2026, 6, 12), "DONE", NOW_MS)).toBe("done");
    expect(toSection(iso(2026, 6, 14), "DONE", NOW_MS)).toBe("done");
    expect(toSection(null, "DONE", NOW_MS)).toBe("done");
  });

  it("未完了なら toDueBucket と同じ分類になる", () => {
    for (const due of [
      iso(2026, 6, 12),
      iso(2026, 6, 13),
      iso(2026, 6, 14),
      null,
    ]) {
      expect(toSection(due, "TODO", NOW_MS)).toBe(toDueBucket(due, NOW_MS));
      expect(toSection(due, "IN_PROGRESS", NOW_MS)).toBe(
        toDueBucket(due, NOW_MS),
      );
    }
  });
});

describe("isStartedToday（nowMs 固定）", () => {
  const ms = (y: number, mo: number, d: number, h: number, mi: number) =>
    Date.UTC(y, mo - 1, d, h, mi, 0, 0);

  it("JST の今日の範囲に入る開始時刻だけ true", () => {
    // JST 2026-06-12 23:59 = UTC 06-12 14:59（前日）
    expect(isStartedToday(ms(2026, 6, 12, 14, 59), NOW_MS)).toBe(false);
    // JST 2026-06-13 00:00 = UTC 06-12 15:00（今日の始まり）
    expect(isStartedToday(ms(2026, 6, 12, 15, 0), NOW_MS)).toBe(true);
    // JST 2026-06-13 23:59 = UTC 06-13 14:59（今日の終わり）
    expect(isStartedToday(ms(2026, 6, 13, 14, 59), NOW_MS)).toBe(true);
    // JST 2026-06-14 00:00 = UTC 06-13 15:00（翌日）
    expect(isStartedToday(ms(2026, 6, 13, 15, 0), NOW_MS)).toBe(false);
  });
});

describe("formatDue（nowMs 固定）", () => {
  it("今日 / 明日 / M/dd / 空 を返す", () => {
    expect(formatDue(iso(2026, 6, 13), NOW_MS)).toBe("今日");
    expect(formatDue(iso(2026, 6, 14), NOW_MS)).toBe("明日");
    expect(formatDue(iso(2026, 6, 20), NOW_MS)).toBe("6/20");
    expect(formatDue(null, NOW_MS)).toBe("");
  });
});

describe("isOverdue（nowMs 固定）", () => {
  it("昨日以前が期限で未完了なら true、完了済み・今日・期限なしは false", () => {
    expect(isOverdue(iso(2026, 6, 12), false, NOW_MS)).toBe(true);
    expect(isOverdue(iso(2026, 6, 12), true, NOW_MS)).toBe(false);
    expect(isOverdue(iso(2026, 6, 13), false, NOW_MS)).toBe(false);
    expect(isOverdue(null, false, NOW_MS)).toBe(false);
  });
});

describe("toFrontTask", () => {
  const base = {
    id: "t1",
    title: "タスク",
    status: "TODO" as const,
    priority: 2,
    dueDate: new Date("2026-06-13T14:59:00.000Z"),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    timeEntries: [{ durationSec: 100 }, { durationSec: 50 }],
  };

  it("生値（priority/status/dueDate/createdAt/elapsed）を返す", () => {
    expect(toFrontTask(base)).toEqual({
      id: "t1",
      title: "タスク",
      priority: 2,
      status: "TODO",
      dueDate: "2026-06-13T14:59:00.000Z",
      createdAt: "2026-06-01T00:00:00.000Z",
      completedAt: null,
      elapsed: 150,
      project: null,
      tags: [],
    });
  });

  it("dueDate が null なら dueDate も null", () => {
    expect(toFrontTask({ ...base, dueDate: null }).dueDate).toBeNull();
  });

  it("durationSec が null の TimeEntry は 0 として集計する", () => {
    expect(
      toFrontTask({ ...base, timeEntries: [{ durationSec: null }] }).elapsed,
    ).toBe(0);
  });
});

// 並び替え・グループ化のテスト用に最小限の Task を作る
function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: overrides.id,
    priority: 0,
    status: "TODO",
    dueDate: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    completedAt: null,
    elapsed: 0,
    project: null,
    tags: [],
    ...overrides,
  };
}

const ids = (tasks: Task[]) => tasks.map((t) => t.id);

describe("compareByDue", () => {
  it("期限の近い順に並び、期限なしは末尾に送る", () => {
    const sorted = [
      task({ id: "期限なし" }),
      task({ id: "6/20", dueDate: iso(2026, 6, 20) }),
      task({ id: "6/14", dueDate: iso(2026, 6, 14) }),
    ].sort(compareByDue);

    expect(ids(sorted)).toEqual(["6/14", "6/20", "期限なし"]);
  });

  it("期限が同じなら優先度の高い順", () => {
    const due = iso(2026, 6, 14);
    const sorted = [
      task({ id: "低", dueDate: due, priority: 0 }),
      task({ id: "高", dueDate: due, priority: 3 }),
      task({ id: "中", dueDate: due, priority: 2 }),
    ].sort(compareByDue);

    expect(ids(sorted)).toEqual(["高", "中", "低"]);
  });

  it("期限も優先度も同じなら作成日の新しい順", () => {
    const due = iso(2026, 6, 14);
    const sorted = [
      task({ id: "古", dueDate: due, createdAt: iso(2026, 6, 1) }),
      task({ id: "新", dueDate: due, createdAt: iso(2026, 6, 10) }),
    ].sort(compareByDue);

    expect(ids(sorted)).toEqual(["新", "古"]);
  });
});

describe("compareByCompletedAt", () => {
  it("完了日時の新しい順に並ぶ", () => {
    const sorted = [
      task({ id: "先週", completedAt: iso(2026, 6, 6) }),
      task({ id: "今日", completedAt: iso(2026, 6, 13) }),
      task({ id: "昨日", completedAt: iso(2026, 6, 12) }),
    ].sort(compareByCompletedAt);

    expect(ids(sorted)).toEqual(["今日", "昨日", "先週"]);
  });

  it("completedAt が無い場合は createdAt で代替する", () => {
    const sorted = [
      task({ id: "作成のみ古", createdAt: iso(2026, 6, 1) }),
      task({ id: "完了あり", completedAt: iso(2026, 6, 10) }),
      task({ id: "作成のみ新", createdAt: iso(2026, 6, 12) }),
    ].sort(compareByCompletedAt);

    expect(ids(sorted)).toEqual(["作成のみ新", "完了あり", "作成のみ古"]);
  });
});

describe("groupBySection（nowMs 固定）", () => {
  it("5つのセクションへ振り分ける", () => {
    const groups = groupBySection(
      [
        task({ id: "期限切れ", dueDate: iso(2026, 6, 12) }),
        task({ id: "今日", dueDate: iso(2026, 6, 13) }),
        task({ id: "今後", dueDate: iso(2026, 6, 20) }),
        task({ id: "日付未設定" }),
        task({ id: "完了", dueDate: iso(2026, 6, 12), status: "DONE" }),
      ],
      NOW_MS,
    );

    expect(ids(groups.overdue)).toEqual(["期限切れ"]);
    expect(ids(groups.today)).toEqual(["今日"]);
    expect(ids(groups.upcoming)).toEqual(["今後"]);
    expect(ids(groups.undated)).toEqual(["日付未設定"]);
    // 完了は期限切れの期限を持っていても完了セクションに入る
    expect(ids(groups.done)).toEqual(["完了"]);
  });

  it("各セクション内が並び替えられる（未完了は期限順、完了は完了日時の新しい順）", () => {
    const groups = groupBySection(
      [
        task({ id: "6/20", dueDate: iso(2026, 6, 20) }),
        task({ id: "6/14", dueDate: iso(2026, 6, 14) }),
        task({ id: "完了-古", status: "DONE", completedAt: iso(2026, 6, 10) }),
        task({ id: "完了-新", status: "DONE", completedAt: iso(2026, 6, 13) }),
      ],
      NOW_MS,
    );

    expect(ids(groups.upcoming)).toEqual(["6/14", "6/20"]);
    expect(ids(groups.done)).toEqual(["完了-新", "完了-古"]);
  });

  it("タスクが無くても5セクション分の空配列を返す", () => {
    const groups = groupBySection([], NOW_MS);

    expect(Object.keys(groups).sort()).toEqual(
      ["done", "overdue", "today", "undated", "upcoming"].sort(),
    );
    expect(Object.values(groups).every((g) => g.length === 0)).toBe(true);
  });
});
