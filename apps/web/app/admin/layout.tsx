import { AdminShell } from "@/app/admin/_components/AdminShell";
import { adminNav } from "@/app/admin/_components/admin-nav";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { enforceWorkspaceAccess } from "@/lib/auth/workspace-guard";
import { DASHBOARD_SIDEBAR_COLLAPSED_KEY, parseSidebarCollapsed } from "@/lib/dashboard-sidebar";
import { cookies } from "next/headers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialSidebarCollapsed = parseSidebarCollapsed(cookieStore.get(DASHBOARD_SIDEBAR_COLLAPSED_KEY)?.value);
  const user = await getCurrentUserFromServer();
  const viewer = enforceWorkspaceAccess("admin", user, "/admin");
  return <AdminShell navItems={adminNav} user={viewer} initialSidebarCollapsed={initialSidebarCollapsed}>{children}</AdminShell>;
}
