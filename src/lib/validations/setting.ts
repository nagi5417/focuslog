import { z } from "zod";

export const settingUpdateSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

export type SettingUpdateInput = z.infer<typeof settingUpdateSchema>;
