import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    emailSendLog: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { normalizeEmail, reserveEmailSend } from "@/lib/auth/email-rate-limit";

const mockLog = vi.mocked(prisma.emailSendLog);

const NOW = new Date("2026-09-13T12:00:00.000Z");
const EMAIL = "user@example.com";

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

// findMany は createdAt の新しい順で返る前提
function logsAt(...minutesList: number[]) {
  return minutesList.map((minutes, i) => ({
    id: `log-${i}`,
    email: EMAIL,
    purpose: "verify",
    createdAt: minutesAgo(minutes),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLog.deleteMany.mockResolvedValue({ count: 0 });
  mockLog.findMany.mockResolvedValue([]);
  mockLog.create.mockResolvedValue(logsAt(0)[0]);
});

describe("normalizeEmail", () => {
  it("前後の空白を除き小文字に揃えること", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe(EMAIL);
  });
});

describe("reserveEmailSend", () => {
  it("送信履歴がなければ許可し、履歴を記録すること", async () => {
    const allowed = await reserveEmailSend(EMAIL, "verify", NOW);

    expect(allowed).toBe(true);
    expect(mockLog.create).toHaveBeenCalledWith({
      data: { email: EMAIL, purpose: "verify", createdAt: NOW },
    });
  });

  it("前回送信から1分未満なら拒否し、履歴を記録しないこと", async () => {
    mockLog.findMany.mockResolvedValue(logsAt(0.5));

    const allowed = await reserveEmailSend(EMAIL, "verify", NOW);

    expect(allowed).toBe(false);
    expect(mockLog.create).not.toHaveBeenCalled();
  });

  it("前回送信からちょうど1分経過していれば許可すること", async () => {
    mockLog.findMany.mockResolvedValue(logsAt(1));

    const allowed = await reserveEmailSend(EMAIL, "verify", NOW);

    expect(allowed).toBe(true);
    expect(mockLog.create).toHaveBeenCalledTimes(1);
  });

  it("24時間以内に5通送っていれば、間隔が空いていても拒否すること", async () => {
    mockLog.findMany.mockResolvedValue(logsAt(60, 120, 180, 240, 300));

    const allowed = await reserveEmailSend(EMAIL, "verify", NOW);

    expect(allowed).toBe(false);
    expect(mockLog.create).not.toHaveBeenCalled();
  });

  it("24時間以内が4通なら許可すること", async () => {
    mockLog.findMany.mockResolvedValue(logsAt(60, 120, 180, 240));

    const allowed = await reserveEmailSend(EMAIL, "verify", NOW);

    expect(allowed).toBe(true);
  });

  it("大文字小文字の違う宛先を同じアドレスとして数え、正規化して記録すること", async () => {
    await reserveEmailSend("User@Example.COM", "verify", NOW);

    expect(mockLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: EMAIL }),
      }),
    );
    expect(mockLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: EMAIL }),
    });
  });

  it("24時間より古い履歴を削除し、判定は同じ用途の24時間以内の履歴で行うこと", async () => {
    const windowStart = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);

    await reserveEmailSend(EMAIL, "reset", NOW);

    expect(mockLog.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: windowStart } },
    });
    expect(mockLog.findMany).toHaveBeenCalledWith({
      where: { email: EMAIL, purpose: "reset", createdAt: { gte: windowStart } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { createdAt: true },
    });
  });
});
