"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { settingUpdateSchema } from "@/lib/validations/setting";
import type { ActionResult } from "@/types";

export type UserSetting = { theme: string; accent: string };

export async function getSetting(): Promise<UserSetting> {
  const user = await requireUser();
  const setting = await prisma.setting.findUnique({
    where: { userId: user.id },
  });
  return {
    theme: setting?.theme ?? "system",
    accent: setting?.accent ?? "blue",
  };
}

export async function updateSetting(
  input: unknown,
): Promise<ActionResult<UserSetting>> {
  const user = await requireUser();
  const parsed = settingUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }
  const updated = await prisma.setting.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });
  // DB と cookie の不整合を防ぐため、保存と同時にサーバー側 cookie も同期する。
  if (parsed.data.accent) {
    (await cookies()).set("fl-accent", parsed.data.accent, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  revalidatePath("/settings");
  return { ok: true, data: { theme: updated.theme, accent: updated.accent } };
}
