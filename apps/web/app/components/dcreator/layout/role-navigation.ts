import type { Role } from "@prisma/client";
import { DASHBOARD_ACCESS, ROLE } from "@/lib/auth/role-constants";
import { hasRole } from "@/lib/auth/dashboard-access";

export type NavItem = { label: string; href: string };
export type NavGroup = { label: string; roles: readonly Role[]; items: NavItem[] };

export const navigationGroups: NavGroup[] = [
  {
    label: "Người dùng",
    roles: DASHBOARD_ACCESS.user,
    items: [
      { label: "Dashboard cá nhân", href: "/dashboard/user" },
      { label: "Chiến dịch", href: "/campaigns" },
      { label: "Ví / N-Points", href: "/wallet" },
      { label: "Voucher của tôi", href: "/vouchers" },
      { label: "Hồ sơ", href: "/dashboard/user/profile" }
    ]
  },
  {
    label: "Nhà sáng tạo",
    roles: DASHBOARD_ACCESS.creator,
    items: [
      { label: "Bảng điều khiển Nhà sáng tạo", href: "/dashboard/creator" },
      { label: "Nhiệm vụ của tôi", href: "/me/mission" }
    ]
  },
  {
    label: "Nhãn hàng",
    roles: DASHBOARD_ACCESS.brand,
    items: [
      { label: "Bảng điều khiển Nhãn hàng", href: "/dashboard/brand" },
      { label: "Onboarding / BCC", href: "/dashboard/brand/onboarding" },
      { label: "Sản phẩm & lô hàng", href: "/dashboard/brand/products" },
      { label: "Yêu cầu chiến dịch", href: "/dashboard/brand/campaign-setup" },
      { label: "Hồ sơ Nhãn hàng", href: "/dashboard/brand/profile" },
      { label: "Chiến dịch", href: "/brand" },
      { label: "Duyệt proof", href: "/brand/proofs" },
      { label: "Quỹ", href: "/wallet" }
    ]
  },
  {
    label: "Quản trị",
    roles: DASHBOARD_ACCESS.admin,
    items: [
      { label: "Bảng điều khiển Admin", href: "/admin" },
      { label: "Người dùng", href: "/admin/users" },
      { label: "Đơn Creator", href: "/admin/creator-applications" },
      { label: "Đơn Brand", href: "/admin/brand-applications" },
      { label: "Nhật ký kiểm toán", href: "/admin/audit" },
      { label: "Duyệt chiến dịch", href: "/admin/campaigns" },
      { label: "Duyệt minh chứng", href: "/admin/proofs" },
      { label: "Tài chính", href: "/admin/finance" }
    ]
  }
];

export function getNavigationItemsByRoles(roles: Role[]) {
  if (roles.length === 0) return [];

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
