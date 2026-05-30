import { BrandMemberRole, BrandMemberStatus, BrandStatus, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { CURRENT_BRAND_COOKIE } from "@/lib/auth/brand-context";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { invalidateCurrentUserCache } from "@/lib/auth/current-user";
import { requireAuth } from "@/lib/auth/guard";
import { getCurrentSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/errors";

const createBrandSchema = z.object({
  brandName: z.string().trim().min(2).max(160),
  industry: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).optional(),
  logoUrl: z.string().trim().url().max(400).optional().or(z.literal(""))
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await requireAuth(request);
    const session = await getCurrentSessionFromRequest(request);
    const payload = createBrandSchema.parse(await request.json());

    const account = await prisma.account.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        profile: { select: { phone: true } }
      }
    });

    const brand = await prisma.$transaction(async (tx) => {
      const existing = await tx.brand.findFirst({
        where: {
          ownerAccountId: user.id,
          name: { equals: payload.brandName, mode: "insensitive" }
        }
      });

      const createdBrand =
        existing ??
        (await tx.brand.create({
          data: {
            ownerAccountId: user.id,
            name: payload.brandName,
            industry: payload.industry,
            description: payload.description?.trim() || null,
            logoUrl: payload.logoUrl?.trim() || null,
            contactName: account.displayName || payload.brandName,
            contactPhone: account.profile?.phone || "N/A",
            contactEmail: account.email,
            status: BrandStatus.ACTIVE
          }
        }));

      await tx.brandMember.upsert({
        where: { brandId_accountId: { brandId: createdBrand.id, accountId: user.id } },
        create: { brandId: createdBrand.id, accountId: user.id, role: BrandMemberRole.OWNER },
        update: { role: BrandMemberRole.OWNER, status: BrandMemberStatus.ACTIVE }
      });

      await tx.accountRole.upsert({
        where: { accountId_role: { accountId: user.id, role: Role.BRAND_OWNER } },
        create: { accountId: user.id, role: Role.BRAND_OWNER },
        update: {}
      });

      await tx.account.update({
        where: { id: user.id },
        data: { role: Role.BRAND_OWNER }
      });

      return { brand: createdBrand, created: !existing };
    });

    if (session?.sid) invalidateCurrentUserCache(session.sid);

    const response = ok({
      id: brand.brand.id,
      name: brand.brand.name,
      status: brand.brand.status,
      created: brand.created
    }, brand.created ? 201 : 200);

    response.cookies.set(CURRENT_BRAND_COOKIE, brand.brand.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
