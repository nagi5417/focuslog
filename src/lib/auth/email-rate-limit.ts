import { prisma } from "@/lib/db";

// 認証メールの送信回数制限。
// "use server" の auth.ts に置くと外部から呼べる Server Action になってしまうため、別モジュールにしている。

export type EmailPurpose = "verify" | "reset";

const MIN_INTERVAL_MS = 60 * 1000; // 前回送信からの最短間隔: 1分
const WINDOW_MS = 24 * 60 * 60 * 1000; // 集計期間: 24時間
const MAX_PER_WINDOW = 5; // 集計期間内の上限

// 大文字小文字を変えて制限をすり抜けられないよう、宛先は小文字に揃えて数える。
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * 送信してよければ履歴を記録して true を返す。制限に達していれば何もせず false を返す。
 *
 * 送信の前に記録するため、送信が失敗しても1回に数える（失敗時の連打を防ぐ）。
 * 判定と記録の間に隙間があり、同時リクエストでは上限を1通程度超えうるが、
 * 目的は大量送信の抑止なので厳密な直列化はしない。
 */
export async function reserveEmailSend(
  email: string,
  purpose: EmailPurpose,
  now: Date = new Date(),
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  // 集計期間を過ぎた履歴は判定に使わないので、宛先を問わずまとめて掃除する。
  await prisma.emailSendLog.deleteMany({
    where: { createdAt: { lt: windowStart } },
  });

  const recent = await prisma.emailSendLog.findMany({
    where: { email: normalized, purpose, createdAt: { gte: windowStart } },
    orderBy: { createdAt: "desc" },
    take: MAX_PER_WINDOW,
    select: { createdAt: true },
  });

  if (recent.length >= MAX_PER_WINDOW) return false;

  const latest = recent[0];
  if (latest && now.getTime() - latest.createdAt.getTime() < MIN_INTERVAL_MS) {
    return false;
  }

  await prisma.emailSendLog.create({
    data: { email: normalized, purpose, createdAt: now },
  });
  return true;
}
