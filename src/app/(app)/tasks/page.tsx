import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/helpers";
import { jstStartOfToday, toFrontTask } from "@/lib/task-transform";
import { getServerNowMs } from "@/lib/now";
import { getTaskClassificationOptions } from "@/lib/actions/classification";
import { TasksPageClient } from "@/components/tasks";
import type { Task } from "@/types/task";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default async function TasksPage() {
  const user = await requireUser();

  // 期限・セクション・期限切れ・「今日の計測」判定の基準「今」をサーバーで確定してクライアントへ渡す
  // （クライアントで new Date() しないことでハイドレーション不一致・JST ずれを防ぐ）
  const nowMs = getServerNowMs();
  const todayStart = jstStartOfToday(nowMs);
  const tomorrowStart = new Date(todayStart.getTime() + ONE_DAY_MS);

  const [dbTasks, activeEntry, classificationOptions, todayTracked] =
    await Promise.all([
    prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tagLinks: {
          include: { tag: { select: { id: true, name: true, color: true } } },
          orderBy: { tag: { name: "asc" } },
        },
        timeEntries: {
          where: { endedAt: { not: null } },
          select: { durationSec: true },
        },
      },
    }),
    prisma.timeEntry.findFirst({
      where: { userId: user.id, endedAt: null },
    }),
    getTaskClassificationOptions(),
    // 今日の計測時間（停止済み分）。レポート画面と同じく開始時刻が今日の記録を数える。
    // 計測中のタイマーは endedAt が null なので含まれず、クライアント側で経過時間を足す。
    prisma.timeEntry.aggregate({
      where: {
        userId: user.id,
        endedAt: { not: null },
        durationSec: { not: null },
        startedAt: { gte: todayStart, lt: tomorrowStart },
      },
      _sum: { durationSec: true },
    }),
  ]);

  const tasks: Task[] = dbTasks.map(toFrontTask);

  const initialActiveTimer = activeEntry
    ? {
        taskId: activeEntry.taskId,
        startedAtMs: activeEntry.startedAt.getTime(),
      }
    : null;

  return (
    <TasksPageClient
      initialTasks={tasks}
      initialActiveTimer={initialActiveTimer}
      initialClassificationOptions={classificationOptions}
      initialTodayTrackedSec={todayTracked._sum.durationSec ?? 0}
      nowMs={nowMs}
    />
  );
}
