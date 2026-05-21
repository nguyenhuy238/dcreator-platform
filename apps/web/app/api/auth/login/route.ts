import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { assertLoginRateLimit } from "@/lib/auth/rate-limit";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";
import { loginSchema } from "@/lib/validators/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const input = loginSchema.parse(body);

    const ip = request.headers.get("x-forwarded-for") ?? "local";
    assertLoginRateLimit(`${ip}:${input.email}`);

    const account = await prisma.account.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, displayName: true, passwordHash: true, role: true, isActive: true }
    });

    if (!account || !account.passwordHash || !account.isActive) {
      throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
    }

    if (!verifyPassword(input.password, account.passwordHash)) {
      throw new AppError("Invalid credentials", 401, "AUTH_INVALID_CREDENTIALS");
    }

    const sessionToken = await createSession(account.id, account.role);
    await setSessionCookie(sessionToken);

    return ok({
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      role: account.role
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
