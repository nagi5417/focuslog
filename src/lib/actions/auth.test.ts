import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    type = "AuthError";
  },
}));

vi.mock("@/lib/auth/auth", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/auth/helpers", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/email", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/auth/email";
import { register } from "@/lib/actions/auth";

const mockUser = vi.mocked(prisma.user);
const mockVerificationToken = vi.mocked(prisma.verificationToken);
const mockSendVerificationEmail = vi.mocked(sendVerificationEmail);

const REGISTER_INPUT = {
  name: "テストユーザー",
  email: "new@example.com",
  password: "Password123!",
};

const UNVERIFIED_USER = {
  id: "user-001",
  name: "未確認ユーザー",
  email: REGISTER_INPUT.email,
  emailVerified: null,
  image: null,
  passwordHash: "hashed-password",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

const VERIFIED_USER = {
  ...UNVERIFIED_USER,
  emailVerified: new Date("2026-01-02T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockVerificationToken.deleteMany.mockResolvedValue({ count: 1 });
  mockVerificationToken.create.mockResolvedValue({
    identifier: `verify:${REGISTER_INPUT.email}`,
    token: "token-001",
    expires: new Date("2026-01-02T00:00:00.000Z"),
  });
  mockSendVerificationEmail.mockResolvedValue(undefined);
});

describe("register", () => {
  it("新規ユーザーを作成して確認メールを送信すること", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue(UNVERIFIED_USER);

    const result = await register(REGISTER_INPUT);

    expect(result.ok).toBe(true);
    expect(mockUser.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: REGISTER_INPUT.email,
        emailVerified: null,
      }),
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      REGISTER_INPUT.email,
      expect.stringContaining("/verify-email?token="),
    );
  });

  it("既存ユーザーが未確認なら確認メールを再送すること", async () => {
    mockUser.findUnique.mockResolvedValue(UNVERIFIED_USER);

    const result = await register(REGISTER_INPUT);

    expect(result.ok).toBe(true);
    expect(mockUser.create).not.toHaveBeenCalled();
    expect(mockVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: `verify:${REGISTER_INPUT.email}` },
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      REGISTER_INPUT.email,
      expect.stringContaining("/verify-email?token="),
    );
  });

  it("既存ユーザーが確認済みならメールを送信しないこと", async () => {
    mockUser.findUnique.mockResolvedValue(VERIFIED_USER);

    const result = await register(REGISTER_INPUT);

    expect(result.ok).toBe(true);
    expect(mockUser.create).not.toHaveBeenCalled();
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it("確認メール送信に失敗したらエラーを返すこと", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue(UNVERIFIED_USER);
    mockSendVerificationEmail.mockRejectedValue(new Error("Resend error"));

    const result = await register(REGISTER_INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("確認メールの送信に失敗");
    }
  });
});
