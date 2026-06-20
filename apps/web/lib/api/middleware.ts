import { NextRequest } from "next/server";
import { z } from "zod";
import { assertRateLimit } from "@/lib/security/rate-limit";

export function getRequestClientKey(request: NextRequest, userScoped?: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return userScoped ? `${ip}:${userScoped}` : ip;
}

export function parseJsonWithSchema<T>(schema: z.ZodSchema<T>, raw: unknown): T {
  return schema.parse(raw);
}

export function assertApiRateLimit(
  request: NextRequest,
  bucket: "login" | "forgot_password" | "reset_password" | "contribution" | "proof_submit" | "payment_create",
  userScoped?: string
) {
  assertRateLimit(bucket, getRequestClientKey(request, userScoped));
}
