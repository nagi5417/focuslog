import { z } from "zod";

export const reportSummaryInputSchema = z.object({
  period: z.enum(["week", "month"]),
  anchorDate: z.coerce.date().optional(),
});

export type ReportSummaryInput = z.infer<typeof reportSummaryInputSchema>;
