"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/helpers";
import { timeEntryEditSchema } from "@/lib/validations/log";
import { toJstDate, jstStartOfWeek } from "@/lib/utils/date";
import type { TimeEntryBlock, BlockColor } from "@/types/report";
import type { ActionResult } from "@/types";

// 指定日のJST 0:00（UTC）
function jstStartOfDay(ref: Date): Date {
  const jst = toJstDate(ref);
  const start = new Date(
    Date.UTC(
      jst.getUTCFullYear(),
      jst.getUTCMonth(),
      jst.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  return new Date(start.getTime() - 9 * 60 * 60 * 1000);
}

// ---- ブロック色決定（タスクIDのハッシュで安定した色を割り当て）----

const BLOCK_COLORS: BlockColor[] = [
  "c-emerald",
  "c-blue",
  "c-violet",
  "c-orange",
  "c-rose",
  "c-cyan",
  "c-amber",
  "c-slate",
];

function pickColor(id: string): BlockColor {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return BLOCK_COLORS[Math.abs(h) % BLOCK_COLORS.length];
}

// ---- DB エントリ → TimeEntryBlock 変換 ----

type PrismaEntry = {
  id: string;
  taskId: string | null;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  task: {
    id: string;
    title: string;
    tagLinks: { tag: { id: string; name: string } }[];
  } | null;
};

function toBlock(entry: PrismaEntry, weekStartUtc: Date): TimeEntryBlock {
  const jstStart = toJstDate(entry.startedAt);
  const jstWeekStart = toJstDate(weekStartUtc);
  const dayIndex = Math.floor(
    (jstStart.getTime() - jstWeekStart.getTime()) / (24 * 60 * 60 * 1000),
  );
  const startMin = jstStart.getUTCHours() * 60 + jstStart.getUTCMinutes();
  const durMin = Math.floor(entry.durationSec / 60);
  const primaryTag = entry.task?.tagLinks[0]?.tag ?? null;
  return {
    id: entry.id,
    taskId: entry.taskId,
    day: dayIndex,
    start: startMin,
    dur: durMin,
    title: entry.task?.title ?? "（タスクなし）",
    tag: primaryTag?.name ?? "",
    color: pickColor(primaryTag?.id ?? entry.taskId ?? entry.id),
    startedAtMs: entry.startedAt.getTime(),
    endedAtMs: entry.endedAt.getTime(),
  };
}

// ---- エクスポート関数 ----

export async function getTimeEntriesForWeek(
  weekStart: Date,
): Promise<TimeEntryBlock[]> {
  const user = await requireUser();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: user.id,
      endedAt: { not: null },
      startedAt: { gte: weekStart, lt: weekEnd },
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          tagLinks: {
            include: { tag: { select: { id: true, name: true } } },
            orderBy: { tag: { name: "asc" } },
          },
        },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  return entries
    .filter(
      (e): e is typeof e & { endedAt: Date; durationSec: number } =>
        e.endedAt !== null && e.durationSec !== null,
    )
    .map((e) => toBlock(e, weekStart));
}

export async function getTimeEntriesForDay(
  date: Date,
): Promise<TimeEntryBlock[]> {
  const user = await requireUser();
  const dayStart = jstStartOfDay(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const weekStart = jstStartOfWeek(date);

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: user.id,
      endedAt: { not: null },
      startedAt: { gte: dayStart, lt: dayEnd },
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          tagLinks: {
            include: { tag: { select: { id: true, name: true } } },
            orderBy: { tag: { name: "asc" } },
          },
        },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  return entries
    .filter(
      (e): e is typeof e & { endedAt: Date; durationSec: number } =>
        e.endedAt !== null && e.durationSec !== null,
    )
    .map((e) => toBlock(e, weekStart));
}

export async function updateTimeEntry(
  id: string,
  startedAt: Date,
  endedAt: Date,
): Promise<ActionResult<TimeEntryBlock>> {
  const user = await requireUser();

  const parsed = timeEntryEditSchema.safeParse({ id, startedAt, endedAt });
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "入力内容を確認してください";
    return { ok: false, error: firstError };
  }

  const entry = await prisma.timeEntry.findFirst({
    where: { id, userId: user.id },
  });
  if (!entry) return { ok: false, error: "エントリが見つかりません" };
  if (!entry.endedAt)
    return { ok: false, error: "計測中のエントリは編集できません" };

  const durationSec = Math.floor(
    (endedAt.getTime() - startedAt.getTime()) / 1000,
  );

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: { startedAt, endedAt, durationSec },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          tagLinks: {
            include: { tag: { select: { id: true, name: true } } },
            orderBy: { tag: { name: "asc" } },
          },
        },
      },
    },
  });

  revalidatePath("/reports");

  const weekStart = jstStartOfWeek(startedAt);
  const block = toBlock(
    {
      ...updated,
      endedAt: updated.endedAt!,
      durationSec: updated.durationSec!,
    },
    weekStart,
  );
  return { ok: true, data: block };
}

export async function deleteTimeEntry(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const entry = await prisma.timeEntry.findFirst({
    where: { id, userId: user.id },
  });
  if (!entry) return { ok: false, error: "エントリが見つかりません" };

  await prisma.timeEntry.delete({ where: { id } });
  revalidatePath("/reports");
  return { ok: true, data: undefined };
}
