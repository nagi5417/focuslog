"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { settingUpdateSchema } from "@/lib/validations/setting";
import type { ActionResult } from "@/types";

export type UserSetting = { theme: string };

export async function getSetting(): Promise<UserSetting> {
  const user = await requireUser();
  const setting = await prisma.setting.findUnique({
    where: { userId: user.id },
  });
  return { theme: setting?.theme ?? "system" };
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
  revalidatePath("/settings");
  return { ok: true, data: { theme: updated.theme } };
}
