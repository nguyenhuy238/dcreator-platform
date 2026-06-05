import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { parseJsonWithSchema } from "@/lib/api/middleware";
import { requireAuth } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/errors";

const updateAccountProfileSchema = z.object({
  avatarUrl: z
    .string()
    .trim()
    .max(400)
    .refine((value) => value.startsWith("/uploads/") || /^https?:\/\//i.test(value), "avatarUrl must be an absolute URL or a local upload path")
    .nullable()
});

export async function PATCH(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    const input = parseJsonWithSchema(updateAccountProfileSchema, await request.json());

    const updated = await prisma.account.update({
      where: { id: account.id },
      data: { avatarUrl: input.avatarUrl },
      select: { id: true, displayName: true, avatarUrl: true, email: true, role: true }
    });

    return ok(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
