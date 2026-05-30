import type { Role } from "@prisma/client";

export type BrandMembershipLike = { id: string; role: "OWNER" | "MANAGER" | "STAFF" };

export type AccessContext = {
  roles: Role[];
  creatorProfile?: { id: string } | null;
  isCreator?: boolean | null;
  brandMemberships?: BrandMembershipLike[];
};

export type UserCapabilities = {
  user: true;
  creator: boolean;
  brand: boolean;
  admin: boolean;
};

export function deriveCapabilities(context: AccessContext): UserCapabilities {
  const roles = context.roles ?? [];
  const hasCreatorRole = roles.includes("CREATOR");
  const hasAdminRole = roles.includes("ADMIN") || roles.includes("OPS");

  return {
    user: true,
    creator: Boolean(context.isCreator ?? context.creatorProfile) || hasCreatorRole,
    brand: (context.brandMemberships?.length ?? 0) > 0,
    admin: hasAdminRole
  };
}
