"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import {
  projectCreateSchema,
  tagCreateSchema,
} from "@/lib/validations/classification";
import type {
  ActionResult,
  ProjectSummary,
  TagSummary,
  TaskClassificationOptions,
} from "@/types";

function normalizeColor(color?: string | null): string | null {
  const trimmed = color?.trim();
  return trimmed ? trimmed : null;
}

export async function getTaskClassificationOptions(): Promise<TaskClassificationOptions> {
  const user = await requireUser();
  const [projects, tags] = await Promise.all([
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.tag.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return { projects, tags };
}

export async function createProject(
  input: unknown,
): Promise<ActionResult<ProjectSummary>> {
  const user = await requireUser();
  const parsed = projectCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const project = await prisma.project.upsert({
    where: {
      userId_name: { userId: user.id, name: parsed.data.name },
    },
    create: {
      userId: user.id,
      name: parsed.data.name,
      color: normalizeColor(parsed.data.color),
    },
    update: {},
    select: { id: true, name: true, color: true },
  });

  revalidatePath("/tasks");
  return { ok: true, data: project };
}

export async function createTag(
  input: unknown,
): Promise<ActionResult<TagSummary>> {
  const user = await requireUser();
  const parsed = tagCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  const tag = await prisma.tag.upsert({
    where: {
      userId_name: { userId: user.id, name: parsed.data.name },
    },
    create: {
      userId: user.id,
      name: parsed.data.name,
      color: normalizeColor(parsed.data.color),
    },
    update: {},
    select: { id: true, name: true, color: true },
  });

  revalidatePath("/tasks");
  return { ok: true, data: tag };
}
