import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/helpers";
import { toFrontTask } from "@/lib/task-transform";
import { getServerNowMs } from "@/lib/now";
import { TasksPageClient } from "@/components/tasks";
import type { Task } from "@/types/task";

export default async function TasksPage() {
  const user = await requireUser();

  const [dbTasks, activeEntry] = await Promise.all([
    prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        timeEntries: {
          where: { endedAt: { not: null } },
          select: { durationSec: true },
        },
      },
    }),
    prisma.timeEntry.findFirst({
      where: { userId: user.id, endedAt: null },
    }),
  ]);

  const tasks: Task[] = dbTasks.map(toFrontTask);

  const initialActiveTimer = activeEntry
    ? {
        taskId: activeEntry.taskId,
        startedAtMs: activeEntry.startedAt.getTime(),
      }
    : null;

  // 期限・セクション・期限切れ判定の基準「今」をサーバーで確定してクライアントへ渡す
  // （クライアントで new Date() しないことでハイドレーション不一致・JST ずれを防ぐ）
  const nowMs = getServerNowMs();

  return (
    <TasksPageClient
      initialTasks={tasks}
      initialActiveTimer={initialActiveTimer}
      nowMs={nowMs}
    />
  );
}
