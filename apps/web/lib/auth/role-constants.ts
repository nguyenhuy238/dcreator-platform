import type { Role } from "@prisma/client";

export const ROLE = {
  USER: "USER",
  CREATOR: "CREATOR",
  BRAND_OWNER: "BRAND_OWNER",
  BRAND_STAFF: "BRAND_STAFF",
  ADMIN: "ADMIN",
  OPS: "OPS"
} as const satisfies Record<string, Role>;

export const ALL_ROLES = Object.values(ROLE) as Role[];

export const DASHBOARD_ACCESS = {
  user: [ROLE.USER, ROLE.CREATOR, ROLE.BRAND_OWNER, ROLE.BRAND_STAFF, ROLE.ADMIN, ROLE.OPS],
  creator: [ROLE.CREATOR, ROLE.ADMIN, ROLE.OPS],
  brand: [ROLE.BRAND_OWNER, ROLE.BRAND_STAFF, ROLE.ADMIN, ROLE.OPS],
  admin: [ROLE.ADMIN, ROLE.OPS]
} as const;

export const ROLE_REDIRECT_PRIORITY: Role[] = [
  ROLE.ADMIN,
  ROLE.OPS,
  ROLE.BRAND_OWNER,
  ROLE.BRAND_STAFF,
  ROLE.CREATOR,
  ROLE.USER
];

export function resolvePrimaryRole(roles: Role[]) {
  for (const role of ROLE_REDIRECT_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return ROLE.USER;
}
