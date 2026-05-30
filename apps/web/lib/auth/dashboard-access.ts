import type { Role } from "@prisma/client";
import type { AccessContext } from "@/lib/auth/capabilities";
import { deriveCapabilities } from "@/lib/auth/capabilities";
import { ROLE_REDIRECT_PRIORITY } from "@/lib/auth/role-constants";

export type DashboardItem = { id: "user" | "creator" | "brand" | "admin"; label: string; href: string };

const DASHBOARD_BY_ROLE: Record<Role, DashboardItem> = {
  ADMIN: { id: "admin", label: "Admin Dashboard", href: "/admin" },
  OPS: { id: "admin", label: "Admin Dashboard", href: "/admin" },
  BRAND_OWNER: { id: "brand", label: "Brand Dashboard", href: "/dashboard/brand" },
  BRAND_STAFF: { id: "brand", label: "Brand Dashboard", href: "/dashboard/brand" },
  CREATOR: { id: "creator", label: "Creator Dashboard", href: "/dashboard/creator" },
  USER: { id: "user", label: "User Dashboard", href: "/dashboard/user" }
};

const DASHBOARD_BY_CAPABILITY: Record<DashboardItem["id"], DashboardItem> = {
  user: DASHBOARD_BY_ROLE.USER,
  creator: DASHBOARD_BY_ROLE.CREATOR,
  brand: DASHBOARD_BY_ROLE.BRAND_OWNER,
  admin: DASHBOARD_BY_ROLE.ADMIN
};

export function hasRole(userRoles: Role[], allowedRoles: readonly Role[]) {
  return userRoles.some((role) => allowedRoles.includes(role));
}

export function getPrimaryDashboard(userRoles: Role[]): DashboardItem {
  for (const role of ROLE_REDIRECT_PRIORITY) {
    if (userRoles.includes(role)) return DASHBOARD_BY_ROLE[role];
  }
  return DASHBOARD_BY_ROLE.USER;
}

export function getDefaultDashboardPath(userRoles: Role[]) {
  return getPrimaryDashboard(userRoles).href;
}

export function getDefaultDashboardPathByContext(context: AccessContext) {
  const capabilities = deriveCapabilities(context);
  if (capabilities.admin) return DASHBOARD_BY_CAPABILITY.admin.href;
  if (capabilities.brand) return DASHBOARD_BY_CAPABILITY.brand.href;
  if (capabilities.creator) return DASHBOARD_BY_CAPABILITY.creator.href;
  return DASHBOARD_BY_CAPABILITY.user.href;
}

export function getAvailableDashboards(userRoles: Role[]): DashboardItem[] {
  if (userRoles.length === 0) return [];
  const items: DashboardItem[] = [];
  const seen = new Set<DashboardItem["id"]>();

  for (const role of ROLE_REDIRECT_PRIORITY) {
    if (!userRoles.includes(role)) continue;
    const item = DASHBOARD_BY_ROLE[role];
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  return items;
}
