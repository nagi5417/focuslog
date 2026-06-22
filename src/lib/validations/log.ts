import { z } from "zod";

export const timeEntryEditSchema = z
  .object({
    id: z.string().cuid(),
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date(),
  })
  .refine((d) => d.endedAt > d.startedAt, {
    message: "終了時刻は開始より後にしてください",
    path: ["endedAt"],
  })
  .refine((d) => d.endedAt <= new Date(), {
    message: "未来の時刻は設定できません",
    path: ["endedAt"],
  });
