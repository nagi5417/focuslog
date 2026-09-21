import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { getServerNowMs } from "@/lib/now";
import { jstEndOfToday } from "@/lib/task-transform";
import { AppShell } from "@/components/layout/AppShell";

type Theme = "light" | "dark" | "system";

function toTheme(value: string | null | undefined): Theme {
  switch (value) {
    case "light":
    case "dark":
    case "system":
      return value;
    default:
      return "system";
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const nowMs = getServerNowMs();

  const [todayTaskCount, activeTimer, setting] = userId
    ? await Promise.all([
        // サイドバーのバッジは「やるべき残り」を表す。タスク画面の
        // 「期限切れ」＋「今日のタスク」セクションの件数と一致させるため、完了済みは数えない
        prisma.task.count({
          where: {
            userId,
            dueDate: { lte: jstEndOfToday(nowMs) },
            status: { not: "DONE" },
          },
        }),
        prisma.timeEntry.findFirst({
          where: { userId, endedAt: null },
          include: { task: { select: { title: true } } },
        }),
        prisma.setting.findUnique({
          where: { userId },
          select: { theme: true, shortcutsEnabled: true },
        }),
      ])
    : [0, null, null];

  const initialActiveTimer =
    activeTimer && activeTimer.taskId
      ? {
          taskId: activeTimer.taskId,
          taskTitle: activeTimer.task?.title ?? "",
          startedAtMs: activeTimer.startedAt.getTime(),
        }
      : null;

  return (
    <AppShell
      user={session?.user}
      todayTaskCount={todayTaskCount}
      hasActiveTimer={Boolean(activeTimer)}
      initialActiveTimer={initialActiveTimer}
      initialTheme={toTheme(setting?.theme)}
      // 設定が未作成のユーザーは既定（オン）
      shortcutsEnabled={setting?.shortcutsEnabled ?? true}
    >
      {children}
    </AppShell>
  );
}
