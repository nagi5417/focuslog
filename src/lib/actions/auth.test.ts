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

vi.mock("@/lib/auth/email-rate-limit", () => ({
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  reserveEmailSend: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    emailSendLog: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/helpers";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/auth/email";
import { reserveEmailSend } from "@/lib/auth/email-rate-limit";
import {
  deleteAccountAction,
  register,
  requestPasswordReset,
} from "@/lib/actions/auth";

const mockUser = vi.mocked(prisma.user);
const mockVerificationToken = vi.mocked(prisma.verificationToken);
const mockEmailSendLog = vi.mocked(prisma.emailSendLog);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockRequireUser = vi.mocked(requireUser);
const mockSendVerificationEmail = vi.mocked(sendVerificationEmail);
const mockSendPasswordResetEmail = vi.mocked(sendPasswordResetEmail);
const mockReserveEmailSend = vi.mocked(reserveEmailSend);

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
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
  // 既定は「制限に達していない」。制限時の挙動は個別のテストで上書きする。
  mockReserveEmailSend.mockResolvedValue(true);
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

  it("確認メールの送信前に verify 用途で回数制限を判定すること", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue(UNVERIFIED_USER);

    await register(REGISTER_INPUT);

    expect(mockReserveEmailSend).toHaveBeenCalledWith(
      REGISTER_INPUT.email,
      "verify",
    );
  });

  it("未確認ユーザーの再登録で制限中なら、トークンを発行せずメールも送らず成功を返すこと", async () => {
    mockUser.findUnique.mockResolvedValue(UNVERIFIED_USER);
    mockReserveEmailSend.mockResolvedValue(false);

    const result = await register(REGISTER_INPUT);

    expect(result.ok).toBe(true);
    // トークンを発行し直すと、直前に届いたメールのリンクが無効になってしまう
    expect(mockVerificationToken.deleteMany).not.toHaveBeenCalled();
    expect(mockVerificationToken.create).not.toHaveBeenCalled();
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it("新規ユーザーでも制限中ならユーザーは作成し、メールは送らず成功を返すこと", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue(UNVERIFIED_USER);
    mockReserveEmailSend.mockResolvedValue(false);

    const result = await register(REGISTER_INPUT);

    expect(result.ok).toBe(true);
    expect(mockUser.create).toHaveBeenCalled();
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });
});

describe("requestPasswordReset", () => {
  const RESET_INPUT = { email: REGISTER_INPUT.email };

  it("登録済みアドレスなら reset 用途で制限を判定し、再設定メールを送ること", async () => {
    mockUser.findUnique.mockResolvedValue(VERIFIED_USER);

    const result = await requestPasswordReset(RESET_INPUT);

    expect(result.ok).toBe(true);
    expect(mockReserveEmailSend).toHaveBeenCalledWith(RESET_INPUT.email, "reset");
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      RESET_INPUT.email,
      expect.stringContaining("/reset-password?token="),
    );
  });

  it("制限中なら、トークンを発行せずメールも送らず成功を返すこと", async () => {
    mockUser.findUnique.mockResolvedValue(VERIFIED_USER);
    mockReserveEmailSend.mockResolvedValue(false);

    const result = await requestPasswordReset(RESET_INPUT);

    expect(result.ok).toBe(true);
    expect(mockVerificationToken.create).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("送信に失敗しても成功を返し、原因をログに残すこと", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUser.findUnique.mockResolvedValue(VERIFIED_USER);
    mockSendPasswordResetEmail.mockRejectedValue(new Error("Resend error"));

    const result = await requestPasswordReset(RESET_INPUT);

    // 失敗時だけ応答を変えると「エラーになる＝登録済み」と判別できてしまう
    expect(result.ok).toBe(true);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("未登録アドレスなら制限判定もせず成功を返すこと", async () => {
    mockUser.findUnique.mockResolvedValue(null);

    const result = await requestPasswordReset(RESET_INPUT);

    expect(result.ok).toBe(true);
    expect(mockReserveEmailSend).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

describe("deleteAccountAction", () => {
  it("退会時に、そのアドレスの送信履歴を正規化したアドレスで削除すること", async () => {
    mockRequireUser.mockResolvedValue({ id: VERIFIED_USER.id } as Awaited<
      ReturnType<typeof requireUser>
    >);
    mockUser.findUnique.mockResolvedValue({
      ...VERIFIED_USER,
      email: "User@Example.com",
    });
    // $transaction のコールバックに prisma モック自体を tx として渡す
    mockTransaction.mockImplementation(((callback: (tx: typeof prisma) => unknown) =>
      callback(prisma)) as never);

    const result = await deleteAccountAction({ email: "User@Example.com" });

    expect(result.ok).toBe(true);
    expect(mockEmailSendLog.deleteMany).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(mockUser.delete).toHaveBeenCalledWith({
      where: { id: VERIFIED_USER.id },
    });
  });
});
