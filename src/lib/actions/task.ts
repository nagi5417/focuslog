"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/helpers";
import { taskInputSchema } from "@/lib/validations/task";
import { toFrontTask } from "@/lib/task-transform";
import type { Task } from "@/types/task";
import type { ActionResult } from "@/types";

export async function getTasks(): Promise<Task[]> {
  const user = await requireUser();
  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      timeEntries: {
        where: { endedAt: { not: null } },
        select: { durationSec: true },
      },
    },
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

  const { title, priority, dueDate } = parsed.data;
  const created = await prisma.task.create({
    data: { userId: user.id, title, priority: priority ?? 0, dueDate },
    include: { timeEntries: { select: { durationSec: true } } },
  });

  revalidatePath("/tasks");
  return { ok: true, data: toFrontTask(created) };
}

export async function toggleTaskDone(id: string): Promise<ActionResult<Task>> {
  const user = await requireUser();
  const task = await prisma.task.findFirst({
    where: { id, userId: user.id },
    include: {
      timeEntries: {
        where: { endedAt: { not: null } },
        select: { durationSec: true },
      },
    },
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
      timeEntries: {
        where: { endedAt: { not: null } },
        select: { durationSec: true },
      },
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
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "入力内容を確認してください" };
  }

  const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!task) return { ok: false, error: "タスクが見つかりません" };

  const updated = await prisma.task.update({
    where: { id },
    data: parsed.data,
    include: {
      timeEntries: {
        where: { endedAt: { not: null } },
        select: { durationSec: true },
      },
    },
  });

  revalidatePath("/tasks");
  return { ok: true, data: toFrontTask(updated) };
}
