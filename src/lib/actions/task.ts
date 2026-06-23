"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/helpers";
import { taskInputSchema } from "@/lib/validations/task";
import { toFrontTask } from "@/lib/task-transform";
import type { Task } from "@/types/task";
import type { ActionResult } from "@/types";

const TASK_INCLUDE = {
  project: { select: { id: true, name: true, color: true } },
  tagLinks: {
    include: { tag: { select: { id: true, name: true, color: true } } },
    orderBy: { tag: { name: "asc" } },
  },
  timeEntries: {
    where: { endedAt: { not: null } },
    select: { durationSec: true },
  },
} as const;

async function validateClassificationOwnership(
  userId: string,
  projectId?: string | null,
  tagIds: string[] = [],
): Promise<string | null> {
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) return "プロジェクトが見つかりません";
  }

  if (tagIds.length > 0) {
    const uniqueTagIds = [...new Set(tagIds)];
    const count = await prisma.tag.count({
      where: { userId, id: { in: uniqueTagIds } },
    });
    if (count !== uniqueTagIds.length) return "タグが見つかりません";
  }

  return null;
}

export async function getTasks(): Promise<Task[]> {
  const user = await requireUser();
  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: TASK_INCLUDE,
  });
  return tasks.map(toFrontTask);
}

export async function createTask(input: unknown): Promise<ActionResult<Task>> {
  const user = await requireUser();
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") {
        (fieldErrors[key] ??= []).push(issue.message);
      }
    }
    return { ok: false, error: "入力内容を確認してください", fieldErrors };
  }

  const { title, priority, dueDate, projectId, tagIds } = parsed.data;
  const uniqueTagIds = [...new Set(tagIds ?? [])];
  const classificationError = await validateClassificationOwnership(
    user.id,
    projectId,
    uniqueTagIds,
  );
  if (classificationError) return { ok: false, error: classificationError };

  const created = await prisma.task.create({
    data: {
      userId: user.id,
      title,
      priority: priority ?? 0,
      dueDate,
      projectId: projectId ?? null,
      tagLinks: {
        create: uniqueTagIds.map((tagId) => ({ tagId })),
      },
    },
    include: TASK_INCLUDE,
  });

  revalidatePath("/tasks");
  return { ok: true, data: toFrontTask(created) };
}

export async function toggleTaskDone(id: string): Promise<ActionResult<Task>> {
  const user = await requireUser();
  const task = await prisma.task.findFirst({
    where: { id, userId: user.id },
    include: TASK_INCLUDE,
  });
  if (!task) return { ok: false, error: "タスクが見つかりません" };

  const isDone = task.status === "DONE";
  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: isDone ? "TODO" : "DONE",
      completedAt: isDone ? null : new Date(),
    },
    include: {
      ...TASK_INCLUDE,
    },
  });

  revalidatePath("/tasks");
  return { ok: true, data: toFrontTask(updated) };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!task) return { ok: false, error: "タスクが見つかりません" };

  await prisma.task.delete({ where: { id } });
  revalidatePath("/tasks");
  return { ok: true, data: undefined };
}

export async function updateTask(
  id: string,
  input: unknown,
): Promise<ActionResult<Task>> {
  const user = await requireUser();
  const parsed = z
    .object({
      title: z.string().min(1).max(200).optional(),
      priority: z.number().int().min(0).max(3).optional(),
      dueDate: z.coerce.date().nullish(),
      projectId: z.string().cuid().nullable().optional(),
      tagIds: z.array(z.string().cuid()).max(20).optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "入力内容を確認してください" };
  }

  const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!task) return { ok: false, error: "タスクが見つかりません" };

  const { tagIds, ...taskData } = parsed.data;
  const uniqueTagIds = tagIds ? [...new Set(tagIds)] : undefined;
  const classificationError = await validateClassificationOwnership(
    user.id,
    taskData.projectId,
    uniqueTagIds ?? [],
  );
  if (classificationError) return { ok: false, error: classificationError };

  const updated = await prisma.$transaction(async (tx) => {
    if (uniqueTagIds) {
      await tx.taskTag.deleteMany({ where: { taskId: id } });
      if (uniqueTagIds.length > 0) {
        await tx.taskTag.createMany({
          data: uniqueTagIds.map((tagId) => ({ taskId: id, tagId })),
        });
      }
    }

    return tx.task.update({
      where: { id },
      data: taskData,
      include: TASK_INCLUDE,
    });
  });

  revalidatePath("/tasks");
  return { ok: true, data: toFrontTask(updated) };
}
