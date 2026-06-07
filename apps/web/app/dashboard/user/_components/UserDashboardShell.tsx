"use client";

import { AppShell } from "@/app/components/dcreator/layout/shell";

export function UserDashboardShell({
  children,
  initialSidebarCollapsed = false
}: {
  children: React.ReactNode;
  initialSidebarCollapsed?: boolean;
}) {
  return <AppShell initialSidebarCollapsed={initialSidebarCollapsed}>{children}</AppShell>;
}
