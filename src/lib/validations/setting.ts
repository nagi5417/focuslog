import { z } from "zod";

export const accentSchema = z.enum([
  "green",
  "blue",
  "yellow",
  "orange",
  "violet",
]);

export const settingUpdateSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  accent: accentSchema.optional(),
}).refine((value) => value.theme !== undefined || value.accent !== undefined, {
  message: "更新する設定を指定してください",
});

export type SettingUpdateInput = z.infer<typeof settingUpdateSchema>;
export type Accent = z.infer<typeof accentSchema>;
