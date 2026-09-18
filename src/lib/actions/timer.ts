"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/helpers";
import type { ActionResult } from "@/types";

export type ActiveTimer = {
  taskId: string | null;
  startedAtMs: number;
};

export async function startTimer(
  taskId: string | null,
): Promise<ActionResult<ActiveTimer>> {
  const user = await requireUser();

  // 自分のタスクか確認する。確認しないと、他人のタスク ID を渡すだけで
  // そのタスクに計測記録を紐づけ、計測時間を水増しできてしまう。
  // 既存の計測を止める前に確認し、拒否した場合は何も変更しない。
  if (taskId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
      select: { id: true },
    });
    if (!task) return { ok: false, error: "タスクが見つかりません" };
  }

  // シングルタスク制約: 既存の計測中エントリを停止
  const active = await prisma.timeEntry.findFirst({
    where: { userId: user.id, endedAt: null },
  });
  if (active) {
    const endedAt = new Date();
    const durationSec = Math.floor(
      (endedAt.getTime() - active.startedAt.getTime()) / 1000,
    );
    await prisma.timeEntry.update({
      where: { id: active.id },
      data: { endedAt, durationSec },
    });
  }

  const entry = await prisma.timeEntry.create({
    data: { userId: user.id, taskId, startedAt: new Date() },
  });

  revalidatePath("/tasks");
  return {
    ok: true,
    data: { taskId, startedAtMs: entry.startedAt.getTime() },
  };
}

export async function stopTimer(): Promise<ActionResult> {
  const user = await requireUser();

  const active = await prisma.timeEntry.findFirst({
    where: { userId: user.id, endedAt: null },
  });
  if (!active) return { ok: false, error: "計測中のタイマーがありません" };

  const endedAt = new Date();
  const durationSec = Math.floor(
    (endedAt.getTime() - active.startedAt.getTime()) / 1000,
  );
  await prisma.timeEntry.update({
    where: { id: active.id },
    data: { endedAt, durationSec },
  });

  revalidatePath("/tasks");
  return { ok: true, data: undefined };
}

export async function getActiveTimer(): Promise<ActiveTimer | null> {
  const user = await requireUser();

  const active = await prisma.timeEntry.findFirst({
    where: { userId: user.id, endedAt: null },
  });
  if (!active) return null;

  return { taskId: active.taskId, startedAtMs: active.startedAt.getTime() };
}
