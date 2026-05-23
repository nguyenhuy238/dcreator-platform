import type { Role } from "@prisma/client";
import { DASHBOARD_ACCESS, ROLE } from "@/lib/auth/role-constants";
import { hasRole } from "@/lib/auth/dashboard-access";

export type NavItem = { label: string; href: string };
export type NavGroup = { label: string; roles: readonly Role[]; items: NavItem[] };

export const navigationGroups: NavGroup[] = [
  {
    label: "User",
    roles: DASHBOARD_ACCESS.user,
    items: [
      { label: "Dashboard cá nhân", href: "/dashboard/user" },
      { label: "Campaign", href: "/campaigns" },
      { label: "Ví / N-Points", href: "/wallet" },
      { label: "Voucher của tôi", href: "/vouchers" },
      { label: "Profile", href: "/dashboard/user/profile" },
      { label: "Đăng ký Creator", href: "/dashboard/user/profile" },
      { label: "Đăng ký Brand", href: "/dashboard/user/profile" }
    ]
  },
  {
    label: "Creator",
    roles: DASHBOARD_ACCESS.creator,
    items: [
      { label: "Creator Dashboard", href: "/dashboard/creator" },
      { label: "Jobs / Missions", href: "/me/mission" },
      { label: "Proof submissions", href: "/dashboard/creator" },
      { label: "Earnings", href: "/dashboard/creator" }
    ]
  },
  {
    label: "Brand",
    roles: DASHBOARD_ACCESS.brand,
    items: [
      { label: "Brand Dashboard", href: "/dashboard/brand" },
      { label: "Campaigns", href: "/dashboard/brand" },
      { label: "Products / Inventory", href: "/dashboard/brand" },
      { label: "Analytics", href: "/dashboard/brand" }
    ]
  },
  {
    label: "Admin",
    roles: DASHBOARD_ACCESS.admin,
    items: [
      { label: "Admin Dashboard", href: "/admin" },
      { label: "Users", href: "/admin/users" },
      { label: "Creator Applications", href: "/admin/creator-applications" },
      { label: "Brand Applications", href: "/admin/brand-applications" },
      { label: "Audit Logs", href: "/admin/audit" },
      { label: "Campaign Review", href: "/admin/campaigns" },
      { label: "Proof Review", href: "/admin/proofs" },
      { label: "Finance", href: "/admin/finance" }
    ]
  }
];

export function getNavigationItemsByRoles(roles: Role[]) {
  const map = new Map<string, NavItem>();
  for (const group of navigationGroups) {
    if (!hasRole(roles, group.roles)) continue;
    for (const item of group.items) {
      map.set(item.href, item);
    }
  }
  return Array.from(map.values());
}

export function isAdminRoles(roles: Role[]) {
  return hasRole(roles, [ROLE.ADMIN, ROLE.OPS]);
}
