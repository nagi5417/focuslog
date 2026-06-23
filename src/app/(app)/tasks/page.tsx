import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/helpers";
import { toFrontTask } from "@/lib/task-transform";
import { getServerNowMs } from "@/lib/now";
import { getTaskClassificationOptions } from "@/lib/actions/classification";
import { TasksPageClient } from "@/components/tasks";
import type { Task } from "@/types/task";

export default async function TasksPage() {
  const user = await requireUser();

  const [dbTasks, activeEntry, classificationOptions] = await Promise.all([
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
      initialClassificationOptions={classificationOptions}
      nowMs={nowMs}
    />
  );
}
