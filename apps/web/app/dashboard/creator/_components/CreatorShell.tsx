"use client";

import type { Role } from "@prisma/client";
import type { CreatorNavItem } from "@/app/dashboard/creator/_components/creator-nav";
import { DashboardShell } from "@/app/components/dcreator/layout/dashboard-shell";

type CreatorShellUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Role[];
};

export function CreatorShell({
  children,
  navItems,
  user
}: {
  children: React.ReactNode;
  navItems: readonly CreatorNavItem[];
  user: CreatorShellUser;
}) {
  return (
    <DashboardShell
      navItems={navItems}
      user={user}
      workspaceTitle="Không gian Creator"
      workspaceDescription="Quản lý nhiệm vụ, minh chứng và hoa hồng"
      loginRedirect="/dashboard/creator"
    >
      {children}
    </DashboardShell>
  );
}
