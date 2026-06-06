import { z } from "zod";

export const brandConsultationCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  facebookUrl: z.string().trim().min(3).max(500),
  source: z.string().trim().min(2).max(120).optional(),
  note: z.string().trim().max(500).optional()
});

export const brandConsultationListQuerySchema = z.object({
  query: z.string().trim().max(120).optional()
});

