import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { ROLE, resolvePrimaryRole } from "@/lib/auth/role-constants";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";
import { registerSchema } from "@/lib/validators/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const input = registerSchema.parse(body);

    const exists = await prisma.account.findUnique({ where: { email: input.email }, select: { id: true } });
    if (exists) {
      throw new AppError("Email already exists", 409, "EMAIL_EXISTS");
    }

    const account = await prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: {
          email: input.email,
          passwordHash: hashPassword(input.password),
          displayName: input.displayName,
          role: Role.USER
        }
      });
      await tx.accountRole.upsert({
        where: { accountId_role: { accountId: created.id, role: Role.USER } },
        create: { accountId: created.id, role: Role.USER },
        update: {}
      });
      return created;
    });

    const assignedRoles = [ROLE.USER] as const;
    const sessionToken = await createSession(account.id, resolvePrimaryRole([...assignedRoles]));
    await setSessionCookie(sessionToken);

    return ok({
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      role: ROLE.USER,
      roles: [ROLE.USER]
    }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
