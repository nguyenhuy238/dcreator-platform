import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertApiRateLimit, parseJsonWithSchema } from "@/lib/api/middleware";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { hashPassword } from "@/lib/auth/password";
import { createTemporaryPassword, sendTemporaryPasswordEmail } from "@/lib/auth/password-reset";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";
import { forgotPasswordSchema } from "@/lib/validators/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const input = parseJsonWithSchema(forgotPasswordSchema, await request.json());
    assertApiRateLimit(request, "forgot_password", input.email);

    const account = await prisma.account.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, isActive: true }
    });

    if (!account?.isActive) {
      throw new AppError("Email không tồn tại.", 404, "EMAIL_NOT_FOUND");
    }

    const temporaryPassword = createTemporaryPassword();
    const loginUrl = `${request.nextUrl.origin}/auth/login`;

    try {
      await sendTemporaryPasswordEmail({ email: account.email, temporaryPassword, loginUrl });
    } catch (error) {
      console.error("Failed to send temporary password email", error);
      const detail = error instanceof Error ? error.message : "";
      const isResendTestingLimit = detail.includes("only send testing emails");
      throw new AppError(
        isResendTestingLimit
          ? "Resend đang ở chế độ test, chỉ gửi được tới email owner. Hãy verify domain để gửi cho email người dùng."
          : "Không thể gửi email khôi phục mật khẩu. Vui lòng kiểm tra cấu hình Resend.",
        502,
        "PASSWORD_RESET_EMAIL_FAILED"
      );
    }

    await prisma.$transaction([
      prisma.account.update({
        where: { id: account.id },
        data: { passwordHash: hashPassword(temporaryPassword) }
      }),
      prisma.authSession.updateMany({
        where: { accountId: account.id, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    return ok({
      message: "Đã gửi mật khẩu tạm tới email của bạn. Vui lòng kiểm tra hộp thư để đăng nhập và đổi mật khẩu mới."
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
