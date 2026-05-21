import { z } from "zod";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(64),
  displayName: z.string().min(2).max(80),
  role: z.enum(["USER", "CREATOR", "BRAND"]).default("USER")
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(64)
});