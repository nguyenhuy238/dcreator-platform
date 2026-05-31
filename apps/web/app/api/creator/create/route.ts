import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { invalidateCurrentUserCache } from "@/lib/auth/current-user";
import { requireAuth } from "@/lib/auth/guard";
import { getCurrentSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/errors";

const createCreatorProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(1000).optional()
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireAuth(request);
    const session = await getCurrentSessionFromRequest(request);
    const payload = createCreatorProfileSchema.parse(await request.json());

    const profile = await prisma.$transaction(async (tx) => {
      const creatorProfile = await tx.creatorProfile.upsert({
        where: { accountId: user.id },
        create: {
          accountId: user.id,
          displayName: payload.displayName,
          bio: payload.bio?.trim() || null
        },
        update: {
          displayName: payload.displayName,
          bio: payload.bio?.trim() || null
        }
      });

      await tx.accountRole.upsert({
        where: { accountId_role: { accountId: user.id, role: Role.CREATOR } },
        create: { accountId: user.id, role: Role.CREATOR },
        update: {}
      });

      await tx.account.update({
        where: { id: user.id },
        data: { role: Role.CREATOR }
      });

      return creatorProfile;
    });

    if (session?.sid) invalidateCurrentUserCache(session.sid);

    return ok({
      id: profile.id,
      displayName: profile.displayName
    }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

