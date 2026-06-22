import { z } from "zod";

export const taskInputSchema = z.object({
  title: z
    .string({ error: "タイトルは必須です" })
    .min(1, "タイトルは必須です")
    .max(200, "タイトルは200文字以内で入力してください"),
  description: z
    .string()
    .max(2000, "説明は2000文字以内で入力してください")
    .optional(),
  priority: z.number().int().min(0).max(3).default(0),
  dueDate: z.coerce.date().optional(),
});

export const updateTaskSchema = taskInputSchema.partial();

export type TaskInput = z.infer<typeof taskInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
