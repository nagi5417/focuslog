import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

// 接続先は .env の DATABASE_URL（Neon の dev ブランチ）に一本化している。
// PrismaClient が .env を読むため、ここで環境変数を読み込む処理は持たない。
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const hashedPassword = await hash("TestPassword123!", 10);
    const testUser = await prisma.user.upsert({
      where: { email: "e2e-test@focuslog.test" },
      update: {
        passwordHash: hashedPassword,
        emailVerified: new Date(),
      },
      create: {
        email: "e2e-test@focuslog.test",
        name: "E2E テストユーザー",
        passwordHash: hashedPassword,
        emailVerified: new Date(),
      },
    });

    // 前回テスト実行の残留データをクリーンアップ（タスク蓄積によるスクロール問題の防止）
    await prisma.timeEntry.deleteMany({ where: { userId: testUser.id } });
    await prisma.task.deleteMany({ where: { userId: testUser.id } });
    // 設定のテストが途中で失敗してショートカットがオフのまま残っても、次の実行に持ち越さない
    await prisma.setting.upsert({
      where: { userId: testUser.id },
      update: { shortcutsEnabled: true },
      create: { userId: testUser.id, shortcutsEnabled: true },
    });
  } finally {
    await prisma.$disconnect();
  }
}
