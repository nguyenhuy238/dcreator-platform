import type { Role } from "@prisma/client";

export const ROLE_LEVEL: Record<Role, number> = {
  USER: 1,
  CREATOR: 2,
  BRAND_STAFF: 3,
  BRAND_OWNER: 4,
  OPS: 5,
  ADMIN: 6
};

export function hasAtLeastRole(role: Role, minimumRole: Role) {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimumRole];
}

export function hasSomeRole(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}
