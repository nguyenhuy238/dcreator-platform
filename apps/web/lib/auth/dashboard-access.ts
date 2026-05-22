import type { Role } from "@prisma/client";
import { DASHBOARD_ACCESS, ROLE_REDIRECT_PRIORITY } from "@/lib/auth/role-constants";

export type DashboardItem = { id: "user" | "creator" | "brand" | "admin"; label: string; href: string };

export function hasRole(userRoles: Role[], allowedRoles: readonly Role[]) {
  return userRoles.some((role) => allowedRoles.includes(role));
}

export function getDefaultDashboardPath(userRoles: Role[]) {
  for (const role of ROLE_REDIRECT_PRIORITY) {
    if (!userRoles.includes(role)) continue;
    if (role === "ADMIN" || role === "OPS") return "/admin";
    if (role === "BRAND_OWNER" || role === "BRAND_STAFF") return "/dashboard/brand";
    if (role === "CREATOR") return "/dashboard/creator";
    if (role === "USER") return "/dashboard/user";
  }
  return "/dashboard/user";
}

export function getAvailableDashboards(userRoles: Role[]): DashboardItem[] {
  const list: DashboardItem[] = [];
  if (hasRole(userRoles, DASHBOARD_ACCESS.user)) list.push({ id: "user", label: "User Dashboard", href: "/dashboard/user" });
  if (hasRole(userRoles, DASHBOARD_ACCESS.creator)) list.push({ id: "creator", label: "Creator Dashboard", href: "/dashboard/creator" });
  if (hasRole(userRoles, DASHBOARD_ACCESS.brand)) list.push({ id: "brand", label: "Brand Dashboard", href: "/dashboard/brand" });
  if (hasRole(userRoles, DASHBOARD_ACCESS.admin)) list.push({ id: "admin", label: "Admin Dashboard", href: "/admin" });
  return list;
}
