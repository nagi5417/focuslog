import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/auth/helpers", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    task: {
      findFirst: vi.fn(),
    },
    timeEntry: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/helpers";
import { resumeLastTimer, startTimer, stopTimer } from "@/lib/actions/timer";

const mockRequireUser = vi.mocked(requireUser);
const mockTimeEntry = vi.mocked(prisma.timeEntry);
const mockTask = vi.mocked(prisma.task);
const mockRevalidatePath = vi.mocked(revalidatePath);

const USER_ID = "user-001";
const TASK_ID = "task-001";
const STARTED_AT = new Date(Date.now() - 60_000); // 1分前

const BASE_ENTRY = {
  id: "entry-001",
  userId: USER_ID,
  taskId: TASK_ID,
  startedAt: STARTED_AT,
  endedAt: null,
  durationSec: null,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({
    id: USER_ID,
    email: "test@example.com",
    name: "テストユーザー",
  });
  // 既定は「自分のタスク」。他人のタスクのケースは個別に上書きする
  mockTask.findFirst.mockResolvedValue({ id: TASK_ID } as never);
});

describe("startTimer", () => {
  it("自分のタスクかをユーザー ID で絞って確認すること", async () => {
    mockTimeEntry.findFirst.mockResolvedValue(null);
    mockTimeEntry.create.mockResolvedValue(BASE_ENTRY);

    await startTimer(TASK_ID);

    expect(mockTask.findFirst).toHaveBeenCalledWith({
      where: { id: TASK_ID, userId: USER_ID },
      select: { id: true },
    });
  });

  it("他人のタスクなら拒否し、計測の作成も既存計測の停止もしないこと", async () => {
    mockTask.findFirst.mockResolvedValue(null);
    mockTimeEntry.findFirst.mockResolvedValue(BASE_ENTRY); // 計測中のエントリがある

    const result = await startTimer("other-users-task");

    expect(result.ok).toBe(false);
    expect(mockTimeEntry.update).not.toHaveBeenCalled();
    expect(mockTimeEntry.create).not.toHaveBeenCalled();
  });

  it("TimeEntry が DB に作成されること", async () => {
    mockTimeEntry.findFirst.mockResolvedValue(null);
    mockTimeEntry.create.mockResolvedValue(BASE_ENTRY);

    const result = await startTimer(TASK_ID);

    expect(result.ok).toBe(true);
    expect(mockTimeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: USER_ID, taskId: TASK_ID }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/tasks");
  });

  it("進行中のエントリがあれば自動停止してから新規開始すること（シングルタスク制約）", async () => {
    mockTimeEntry.findFirst.mockResolvedValue(BASE_ENTRY);
    mockTimeEntry.update.mockResolvedValue({
      ...BASE_ENTRY,
      endedAt: new Date(),
      durationSec: 60,
    });
    mockTimeEntry.create.mockResolvedValue({
      ...BASE_ENTRY,
      id: "entry-002",
      taskId: "task-002",
    });

    const result = await startTimer("task-002");

    expect(result.ok).toBe(true);
    // 既存エントリを停止（update）してから新規作成（create）している
    expect(mockTimeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BASE_ENTRY.id },
        data: expect.objectContaining({
          endedAt: expect.any(Date),
          durationSec: expect.any(Number),
        }),
      }),
    );
    expect(mockTimeEntry.create).toHaveBeenCalled();
  });

  it("startedAtMs が返り値に含まれること", async () => {
    mockTimeEntry.findFirst.mockResolvedValue(null);
    mockTimeEntry.create.mockResolvedValue(BASE_ENTRY);

    const result = await startTimer(TASK_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.startedAtMs).toBe(STARTED_AT.getTime());
      expect(result.data.taskId).toBe(TASK_ID);
    }
  });
});

describe("stopTimer", () => {
  it("endedAt と durationSec が正しく設定されること", async () => {
    mockTimeEntry.findFirst.mockResolvedValue(BASE_ENTRY);
    mockTimeEntry.update.mockResolvedValue({
      ...BASE_ENTRY,
      endedAt: new Date(),
      durationSec: 60,
    });

    const result = await stopTimer();

    expect(result.ok).toBe(true);
    expect(mockTimeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BASE_ENTRY.id },
        data: expect.objectContaining({
          endedAt: expect.any(Date),
          durationSec: expect.any(Number),
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/tasks");
  });

  it("進行中エントリがなければ { ok: false } を返すこと", async () => {
    mockTimeEntry.findFirst.mockResolvedValue(null);

    const result = await stopTimer();

    expect(result.ok).toBe(false);
    expect(mockTimeEntry.update).not.toHaveBeenCalled();
  });

  it("durationSec が経過時間（秒）として計算されること", async () => {
    const twoMinutesAgo = new Date(Date.now() - 120_000);
    mockTimeEntry.findFirst.mockResolvedValue({
      ...BASE_ENTRY,
      startedAt: twoMinutesAgo,
    });
    mockTimeEntry.update.mockResolvedValue({
      ...BASE_ENTRY,
      endedAt: new Date(),
      durationSec: 120,
    });

    await stopTimer();

    const updateCall = mockTimeEntry.update.mock.calls[0][0];
    expect(updateCall.data.durationSec).toBeGreaterThanOrEqual(119);
    expect(updateCall.data.durationSec).toBeLessThanOrEqual(121);
  });
});

describe("resumeLastTimer", () => {
  it("直前に計測していた未完了タスクを再開し、タスク名と開始時刻を返すこと", async () => {
    mockTimeEntry.findFirst
      .mockResolvedValueOnce({ task: { id: TASK_ID, title: "資料作成" } } as never) // 直前の計測
      .mockResolvedValueOnce(null); // startTimer 内: 計測中のエントリなし
    mockTimeEntry.create.mockResolvedValue(BASE_ENTRY);

    const result = await resumeLastTimer();

    expect(result).toEqual({
      ok: true,
      data: {
        taskId: TASK_ID,
        title: "資料作成",
        startedAtMs: STARTED_AT.getTime(),
      },
    });
    expect(mockTimeEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: USER_ID, taskId: TASK_ID }),
      }),
    );
  });

  it("自分の未完了タスクの計測記録だけを、開始の新しい順で探すこと", async () => {
    mockTimeEntry.findFirst.mockResolvedValueOnce(null);

    await resumeLastTimer();

    expect(mockTimeEntry.findFirst).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        endedAt: { not: null },
        task: { is: { userId: USER_ID, status: { not: "DONE" } } },
      },
      orderBy: { startedAt: "desc" },
      select: { task: { select: { id: true, title: true } } },
    });
  });

  it("再開できるタスクがなければ何も開始せず null を返すこと", async () => {
    mockTimeEntry.findFirst.mockResolvedValueOnce(null);

    const result = await resumeLastTimer();

    expect(result).toEqual({ ok: true, data: null });
    expect(mockTimeEntry.create).not.toHaveBeenCalled();
  });
});
