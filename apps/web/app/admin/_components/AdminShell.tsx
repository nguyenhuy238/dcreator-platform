"use client";

import type { Role } from "@prisma/client";
import type { AdminNavItem } from "@/app/admin/_components/admin-nav";
import { DashboardShell } from "@/app/components/dcreator/layout/dashboard-shell";

type AdminShellUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Role[];
};

export function AdminShell({
  children,
  navItems,
  user
}: {
  children: React.ReactNode;
  navItems: readonly AdminNavItem[];
  user: AdminShellUser;
}) {
  return (
    <DashboardShell
      navItems={navItems}
      user={user}
      workspaceTitle="Bảng điều khiển Admin"
      workspaceDescription="Trung tâm vận hành và quản lý"
      loginRedirect="/admin"
    >
      {children}
    </DashboardShell>
  );
}
