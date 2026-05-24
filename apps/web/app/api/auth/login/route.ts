import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertApiRateLimit, parseJsonWithSchema } from "@/lib/api/middleware";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { resolvePrimaryRole } from "@/lib/auth/role-constants";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";
import { loginSchema } from "@/lib/validators/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const input = parseJsonWithSchema(loginSchema, body);
    assertApiRateLimit(request, "login", input.email);

    const account = await prisma.account.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, displayName: true, passwordHash: true, role: true, isActive: true, roleAssignments: { select: { role: true } } }
    });

    if (!account || !account.passwordHash || !account.isActive) {
      throw new AppError("Sai thông tin đăng nhập!", 401, "AUTH_INVALID_CREDENTIALS");
    }

    if (!verifyPassword(input.password, account.passwordHash)) {
      throw new AppError("Sai thông tin đăng nhập!", 401, "AUTH_INVALID_CREDENTIALS");
    }

    const assignmentRoles = account.roleAssignments.map((item) => item.role);
    const roles = Array.from(new Set(assignmentRoles.length > 0 ? assignmentRoles : [account.role]));
    const primaryRole = resolvePrimaryRole(roles);
    const sessionToken = await createSession(account.id, primaryRole);
    await setSessionCookie(sessionToken);

    return ok({
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      role: primaryRole,
      roles
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
