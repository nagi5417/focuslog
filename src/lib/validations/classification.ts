import { z } from "zod";

export const classificationNameSchema = z
  .string({ error: "名前は必須です" })
  .trim()
  .min(1, "名前は必須です")
  .max(40, "名前は40文字以内で入力してください");

export const classificationColorSchema = z
  .string()
  .trim()
  .max(40, "色は40文字以内で入力してください")
  .nullable()
  .optional();

export const projectCreateSchema = z.object({
  name: classificationNameSchema,
  color: classificationColorSchema,
});

export const tagCreateSchema = z.object({
  name: classificationNameSchema,
  color: classificationColorSchema,
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type TagCreateInput = z.infer<typeof tagCreateSchema>;
