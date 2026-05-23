import { z } from "zod";

export const adminReportPeriodSchema = z.object({
  period: z.enum(["7d", "30d", "month"]).default("7d")
});

