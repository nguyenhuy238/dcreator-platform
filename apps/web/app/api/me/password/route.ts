import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { parseJsonWithSchema } from "@/lib/api/middleware";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { requireAuth } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(64),
  newPassword: z.string().min(8).max(64)
});

export async function PATCH(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    const input = parseJsonWithSchema(updatePasswordSchema, await request.json());
    const currentPassword = input.currentPassword.trim();
    const newPassword = input.newPassword.trim();

    const current = await prisma.account.findUnique({
      where: { id: account.id },
      select: { passwordHash: true }
    });

    if (!current?.passwordHash || !verifyPassword(currentPassword, current.passwordHash)) {
      throw new AppError("Mật khẩu hiện tại không đúng.", 422, "CURRENT_PASSWORD_INVALID");
    }

    await prisma.account.update({
      where: { id: account.id },
      data: { passwordHash: hashPassword(newPassword) }
    });

    return ok({ message: "Đã đổi mật khẩu thành công." });
  } catch (error) {
    return toErrorResponse(error);
  }
}
