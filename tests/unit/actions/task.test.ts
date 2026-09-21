import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

// requireUser は個別モックで上書き
vi.mock("@/lib/auth/helpers", () => ({
  requireUser: vi.fn(),
}));

// prisma モックは setup.ts で定義済み。task.ts は "@/lib/db" から import するため
// "@/lib/db" もモック対象に含める
vi.mock("@/lib/db", () => ({
  prisma: {
    task: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
    tag: {
      count: vi.fn(),
    },
    taskTag: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    timeEntry: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/helpers";
import {
  createTask,
  deleteTask,
  updateTask,
  toggleTaskDone,
} from "@/lib/actions/task";

const mockRequireUser = vi.mocked(requireUser);
const mockPrismaTask = vi.mocked(prisma.task);
const mockPrismaTransaction = vi.mocked(prisma.$transaction);
const mockRevalidatePath = vi.mocked(revalidatePath);

const USER_ID = "user-001";
const TASK_ID = "task-001";

const BASE_PRISMA_TASK = {
  id: TASK_ID,
  title: "テストタスク",
  status: "TODO" as const,
  priority: 0,
  projectId: null,
  description: null,
  dueDate: null,
  completedAt: null,
  userId: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  timeEntries: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrismaTransaction.mockImplementation(async (fn) =>
    fn({
      task: {
        update: mockPrismaTask.update,
      },
      taskTag: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    } as never),
  );
  mockRequireUser.mockResolvedValue({
    id: USER_ID,
    email: "test@example.com",
    name: "テストユーザー",
  });
});

describe("createTask", () => {
  it("正常な入力で DB にタスクが保存されること", async () => {
    mockPrismaTask.create.mockResolvedValue(BASE_PRISMA_TASK);

    const result = await createTask({ title: "テストタスク", priority: 0 });

    expect(result.ok).toBe(true);
    expect(mockPrismaTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          title: "テストタスク",
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/tasks");
  });

  it("タイトルが空文字のとき { ok: false } を返すこと", async () => {
    const result = await createTask({ title: "", priority: 0 });

    expect(result.ok).toBe(false);
    expect(mockPrismaTask.create).not.toHaveBeenCalled();
  });

  it("タイトルが 201 文字のとき { ok: false } を返すこと", async () => {
    const result = await createTask({ title: "あ".repeat(201), priority: 0 });

    expect(result.ok).toBe(false);
    expect(mockPrismaTask.create).not.toHaveBeenCalled();
  });
});

describe("deleteTask", () => {
  it("削除後に revalidatePath が呼ばれること", async () => {
    mockPrismaTask.findFirst.mockResolvedValue(BASE_PRISMA_TASK);
    mockPrismaTask.delete.mockResolvedValue(BASE_PRISMA_TASK);

    const result = await deleteTask(TASK_ID);

    expect(result.ok).toBe(true);
    expect(mockPrismaTask.delete).toHaveBeenCalledWith({
      where: { id: TASK_ID },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/tasks");
  });

  it("他ユーザーのタスクが見つからないとき { ok: false } を返すこと", async () => {
    mockPrismaTask.findFirst.mockResolvedValue(null);

    const result = await deleteTask(TASK_ID);

    expect(result.ok).toBe(false);
    expect(mockPrismaTask.delete).not.toHaveBeenCalled();
  });
});

describe("updateTask", () => {
  it("タスクのステータス変更が DB に反映されること", async () => {
    const updatedTask = { ...BASE_PRISMA_TASK, priority: 2 };
    mockPrismaTask.findFirst.mockResolvedValue(BASE_PRISMA_TASK);
    mockPrismaTask.update.mockResolvedValue(updatedTask);

    const result = await updateTask(TASK_ID, { priority: 2 });

    expect(result.ok).toBe(true);
    expect(mockPrismaTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TASK_ID },
        data: expect.objectContaining({ priority: 2 }),
      }),
    );
  });

  it("他ユーザーのタスクへのアクセスで { ok: false } を返すこと", async () => {
    mockPrismaTask.findFirst.mockResolvedValue(null);

    const result = await updateTask(TASK_ID, { title: "変更後" });

    expect(result.ok).toBe(false);
    expect(mockPrismaTask.update).not.toHaveBeenCalled();
  });

  it("dueDate に null を渡すと期限がクリアされること", async () => {
    mockPrismaTask.findFirst.mockResolvedValue(BASE_PRISMA_TASK);
    mockPrismaTask.update.mockResolvedValue({
      ...BASE_PRISMA_TASK,
      dueDate: null,
    });

    const result = await updateTask(TASK_ID, { dueDate: null });

    expect(result.ok).toBe(true);
    expect(mockPrismaTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dueDate: null }),
      }),
    );
  });

  it("priority が範囲外（4以上）のとき { ok: false } を返すこと", async () => {
    mockPrismaTask.findFirst.mockResolvedValue(BASE_PRISMA_TASK);

    const result = await updateTask(TASK_ID, { priority: 5 });

    expect(result.ok).toBe(false);
    expect(mockPrismaTask.update).not.toHaveBeenCalled();
  });
});

describe("toggleTaskDone", () => {
  it("TODO → DONE に切り替えたとき DB が更新されること", async () => {
    const doneTask = { ...BASE_PRISMA_TASK, status: "DONE" as const };
    mockPrismaTask.findFirst.mockResolvedValue(BASE_PRISMA_TASK);
    mockPrismaTask.update.mockResolvedValue(doneTask);

    const result = await toggleTaskDone(TASK_ID);

    expect(result.ok).toBe(true);
    expect(mockPrismaTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TASK_ID },
        data: expect.objectContaining({ status: "DONE" }),
      }),
    );
  });

  it("タスクが見つからないとき { ok: false } を返すこと", async () => {
    mockPrismaTask.findFirst.mockResolvedValue(null);

    const result = await toggleTaskDone(TASK_ID);

    expect(result.ok).toBe(false);
    expect(mockPrismaTask.update).not.toHaveBeenCalled();
  });
});
