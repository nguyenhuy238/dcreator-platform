"use client";

import type { Role } from "@prisma/client";
import { NotificationBell } from "@/app/_components/NotificationBell";
import { DashboardSwitcher } from "@/app/components/dcreator/layout/dashboard-switcher";
import type { CreatorNavItem } from "@/app/dashboard/creator/_components/creator-nav";
import { DashboardShell } from "@/app/components/dcreator/layout/dashboard-shell";
import type { UserCapabilities } from "@/lib/auth/capabilities";

type CreatorShellUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Role[];
  capabilities: UserCapabilities;
};

export function CreatorShell({
  children,
  navItems,
  user,
  initialSidebarCollapsed = false
}: {
  children: React.ReactNode;
  navItems: readonly CreatorNavItem[];
  user: CreatorShellUser;
  initialSidebarCollapsed?: boolean;
}) {
  return (
    <DashboardShell
      navItems={navItems}
      user={user}
      workspaceTitle="Bảng điều khiển nhà sáng tạo"
      workspaceDescription="Quản lý nhiệm vụ, minh chứng và hoa hồng"
      loginRedirect="/dashboard/creator"
      initialSidebarCollapsed={initialSidebarCollapsed}
      headerAccessory={<NotificationBell />}
    >
      <DashboardSwitcher roles={user.roles} capabilities={user.capabilities} />
      {children}
    </DashboardShell>
  );
}
