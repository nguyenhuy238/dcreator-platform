import type { Role } from "@prisma/client";
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

export function getAvailableDashboards(userRoles: Role[]): DashboardItem[] {
  if (userRoles.length === 0) return [];
  return [getPrimaryDashboard(userRoles)];
}
