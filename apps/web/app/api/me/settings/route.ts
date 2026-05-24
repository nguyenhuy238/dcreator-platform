import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { parseJsonWithSchema } from "@/lib/api/middleware";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { requireAuth } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";
import { updateUserSettingsSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    const settings = await prisma.accountSettings.upsert({
      where: { accountId: account.id },
      create: { accountId: account.id },
      update: {},
      select: {
        notifyReviewStatusEmail: true,
        notifyVoucherMissionEmail: true,
        updatedAt: true
      }
    });

    return ok(settings);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    const input = parseJsonWithSchema(updateUserSettingsSchema, await request.json());

    const shouldChangePassword = Boolean(input.currentPassword && input.newPassword);
    if (shouldChangePassword) {
      const current = await prisma.account.findUnique({
        where: { id: account.id },
        select: { passwordHash: true }
      });
      if (!current?.passwordHash || !verifyPassword(input.currentPassword!, current.passwordHash)) {
        throw new AppError("Mật khẩu hiện tại không đúng.", 422, "CURRENT_PASSWORD_INVALID");
      }
      await prisma.account.update({
        where: { id: account.id },
        data: { passwordHash: hashPassword(input.newPassword!) }
      });
    }

    const settings = await prisma.accountSettings.upsert({
      where: { accountId: account.id },
      create: {
        accountId: account.id,
        notifyReviewStatusEmail: input.notifyReviewStatusEmail,
        notifyVoucherMissionEmail: input.notifyVoucherMissionEmail
      },
      update: {
        notifyReviewStatusEmail: input.notifyReviewStatusEmail,
        notifyVoucherMissionEmail: input.notifyVoucherMissionEmail
      },
      select: {
        notifyReviewStatusEmail: true,
        notifyVoucherMissionEmail: true,
        updatedAt: true
      }
    });

    return ok({
      message: shouldChangePassword ? "Đã cập nhật cài đặt và đổi mật khẩu." : "Đã cập nhật cài đặt tài khoản.",
      settings
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

