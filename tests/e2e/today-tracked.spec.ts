import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { TasksPage } from "./pages/TasksPage";

/**
 * ヘッダーの「計測」が、タスクの期限に関係なく「計測を開始した日」で集計されることを確かめる。
 *
 * 数秒の計測ではヘッダーが「0m」のままで判定できないため、計測記録を直接作って集計に入るかを見る。
 * 他のテストが作った今日の計測記録が混ざっても判定できるよう、前後の差分で確認する。
 */

const E2E_EMAIL = "e2e-test@focuslog.test";
const SEEDED_SEC = 3 * 60; // 3分

const prisma = new PrismaClient();

// 「· 計測 1h 5m」→ 65（分）
async function readTrackedMinutes(page: Page): Promise<number> {
  const text = (await page.getByTestId("today-tracked").textContent()) ?? "";
  const hours = Number(text.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(text.match(/(\d+)m/)?.[1] ?? 0);
  return hours * 60 + minutes;
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("期限切れのタスクを今日計測した分が、ヘッダーの計測に加算されること", async ({
  page,
}) => {
  const tasksPage = new TasksPage(page);
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: E2E_EMAIL },
    select: { id: true },
  });

  await page.goto("/tasks");
  const before = await readTrackedMinutes(page);

  // 期限が過去のタスク（期限切れセクションに入る）
  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: `期限切れ計測-${Date.now()}`,
      dueDate: new Date("2020-01-01T09:00:00.000Z"),
    },
    select: { id: true, title: true },
  });

  // 今日の計測記録（開始も終了も今日）
  const startedAt = new Date(Date.now() - 10 * 60 * 1000);
  const entry = await prisma.timeEntry.create({
    data: {
      userId: user.id,
      taskId: task.id,
      startedAt,
      endedAt: new Date(startedAt.getTime() + SEEDED_SEC * 1000),
      durationSec: SEEDED_SEC,
    },
    select: { id: true },
  });

  try {
    await page.reload();

    // 期限切れセクションに入っていること（= 期限は過去のまま）
    await expect(tasksPage.sectionRow("overdue", task.title)).toHaveCount(1);

    // 期限に関係なく、計測した日（今日）の分として加算される
    const after = await readTrackedMinutes(page);
    expect(after).toBe(before + SEEDED_SEC / 60);
  } finally {
    await prisma.timeEntry.delete({ where: { id: entry.id } });
    await prisma.task.delete({ where: { id: task.id } });
  }
});

test("昨日計測した分は、今日の計測に含まれないこと", async ({ page }) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: E2E_EMAIL },
    select: { id: true },
  });

  await page.goto("/tasks");
  const before = await readTrackedMinutes(page);

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: `昨日の計測-${Date.now()}`,
      dueDate: new Date("2020-01-01T09:00:00.000Z"),
    },
    select: { id: true },
  });
  const startedAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const entry = await prisma.timeEntry.create({
    data: {
      userId: user.id,
      taskId: task.id,
      startedAt,
      endedAt: new Date(startedAt.getTime() + SEEDED_SEC * 1000),
      durationSec: SEEDED_SEC,
    },
    select: { id: true },
  });

  try {
    await page.reload();

    expect(await readTrackedMinutes(page)).toBe(before);
  } finally {
    await prisma.timeEntry.delete({ where: { id: entry.id } });
    await prisma.task.delete({ where: { id: task.id } });
  }
});
