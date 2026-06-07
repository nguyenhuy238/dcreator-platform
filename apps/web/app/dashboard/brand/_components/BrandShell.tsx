"use client";

import type { Role } from "@prisma/client";
import type { BrandNavItem } from "@/app/dashboard/brand/_components/brand-nav";
import { BrandSwitcher } from "@/app/dashboard/brand/_components/BrandSwitcher";
import { DashboardSwitcher } from "@/app/components/dcreator/layout/dashboard-switcher";
import { DashboardShell } from "@/app/components/dcreator/layout/dashboard-shell";
import type { UserCapabilities } from "@/lib/auth/capabilities";

type BrandShellUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Role[];
  capabilities: UserCapabilities;
};

export function BrandShell({
  children,
  navItems,
  user,
  initialSidebarCollapsed = false
}: {
  children: React.ReactNode;
  navItems: readonly BrandNavItem[];
  user: BrandShellUser;
  initialSidebarCollapsed?: boolean;
}) {
  return (
    <DashboardShell
      navItems={navItems}
      user={user}
      workspaceTitle="Bảng điều khiển Nhãn hàng"
      workspaceDescription="Quản lý onboarding, campaign, creator"
      loginRedirect="/dashboard/brand"
      initialSidebarCollapsed={initialSidebarCollapsed}
    >
      <div className="mb-4 flex flex-wrap items-start gap-x-6 gap-y-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <DashboardSwitcher roles={user.roles} capabilities={user.capabilities} className="mb-0" />
        <BrandSwitcher className="mb-0" inline />
      </div>
      {children}
    </DashboardShell>
  );
}
