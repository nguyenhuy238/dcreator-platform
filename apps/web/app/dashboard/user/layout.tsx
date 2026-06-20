import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { enforceWorkspaceAccess } from "@/lib/auth/workspace-guard";
import { DASHBOARD_SIDEBAR_COLLAPSED_KEY, parseSidebarCollapsed } from "@/lib/dashboard-sidebar";
import { cookies } from "next/headers";
import { UserDashboardShell } from "./_components/UserDashboardShell";

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialSidebarCollapsed = parseSidebarCollapsed(cookieStore.get(DASHBOARD_SIDEBAR_COLLAPSED_KEY)?.value);
  const user = await getCurrentUserFromServer();
  enforceWorkspaceAccess("user", user, "/dashboard/user");
  return <UserDashboardShell initialSidebarCollapsed={initialSidebarCollapsed}>{children}</UserDashboardShell>;
}
