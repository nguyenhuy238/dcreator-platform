import { CreatorShell } from "@/app/dashboard/creator/_components/CreatorShell";
import { creatorNav } from "@/app/dashboard/creator/_components/creator-nav";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { enforceWorkspaceAccess } from "@/lib/auth/workspace-guard";
import { DASHBOARD_SIDEBAR_COLLAPSED_KEY, parseSidebarCollapsed } from "@/lib/dashboard-sidebar";
import { cookies } from "next/headers";

export default async function CreatorDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialSidebarCollapsed = parseSidebarCollapsed(cookieStore.get(DASHBOARD_SIDEBAR_COLLAPSED_KEY)?.value);
  const user = await getCurrentUserFromServer();
  const viewer = enforceWorkspaceAccess("creator", user, "/dashboard/creator");
  return <CreatorShell navItems={creatorNav} user={viewer} initialSidebarCollapsed={initialSidebarCollapsed}>{children}</CreatorShell>;
}
