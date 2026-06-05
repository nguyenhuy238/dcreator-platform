import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { parseJsonWithSchema } from "@/lib/api/middleware";
import { requireAuth } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";

function isValidVietnamPhone(value: string) {
  if (!/^\+?[0-9\s]+$/.test(value)) return false;
  const normalized = value.replace(/\s+/g, "");
  return /^0\d{9,10}$/.test(normalized) || /^\+84\d{9,10}$/.test(normalized);
}

const updateAccountProfileSchema = z.object({
  avatarUrl: z
    .string()
    .trim()
    .max(400)
    .refine((value) => value.startsWith("/uploads/") || /^https?:\/\//i.test(value), "avatarUrl must be an absolute URL or a local upload path")
    .nullable()
    .optional(),
  phone: z
    .string()
    .trim()
    .max(24)
    .refine((value) => !value || isValidVietnamPhone(value), "Số điện thoại không hợp lệ.")
    .nullable()
    .optional()
}).refine((value) => Object.prototype.hasOwnProperty.call(value, "avatarUrl") || Object.prototype.hasOwnProperty.call(value, "phone"), {
  message: "Không có dữ liệu cần cập nhật."
});

export async function PATCH(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    const input = parseJsonWithSchema(updateAccountProfileSchema, await request.json());

    if (input.avatarUrl === undefined && input.phone === undefined) {
      throw new AppError("Không có dữ liệu cần cập nhật.", 422, "NO_PROFILE_UPDATE_DATA");
    }

    const updated = await prisma.account.update({
      where: { id: account.id },
      data: {
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.phone !== undefined
          ? {
              profile: {
                upsert: {
                  create: { phone: input.phone?.trim() || null },
                  update: { phone: input.phone?.trim() || null }
                }
              }
            }
          : {})
      },
      select: { id: true, displayName: true, avatarUrl: true, email: true, role: true, profile: { select: { phone: true } } }
    });

    return ok(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
