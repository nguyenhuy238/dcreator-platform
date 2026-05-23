"use client";

import type { Role } from "@prisma/client";
import type { BrandNavItem } from "@/app/dashboard/brand/_components/brand-nav";
import { DashboardShell } from "@/app/components/dcreator/layout/dashboard-shell";

type BrandShellUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Role[];
};

export function BrandShell({
  children,
  navItems,
  user
}: {
  children: React.ReactNode;
  navItems: readonly BrandNavItem[];
  user: BrandShellUser;
}) {
  return (
    <DashboardShell
      navItems={navItems}
      user={user}
      workspaceTitle="Bảng điều khiển Nhãn hàng"
      workspaceDescription="Quản lý onboarding, campaign, creator và quỹ Brand"
      loginRedirect="/dashboard/brand"
    >
      {children}
    </DashboardShell>
  );
}
