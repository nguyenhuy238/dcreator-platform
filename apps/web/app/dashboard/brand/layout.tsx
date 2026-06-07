import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { enforceWorkspaceAccess } from "@/lib/auth/workspace-guard";
import { BrandShell } from "@/app/dashboard/brand/_components/BrandShell";
import { brandNav } from "@/app/dashboard/brand/_components/brand-nav";
import { DASHBOARD_SIDEBAR_COLLAPSED_KEY, parseSidebarCollapsed } from "@/lib/dashboard-sidebar";
import { cookies } from "next/headers";

export default async function BrandDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialSidebarCollapsed = parseSidebarCollapsed(cookieStore.get(DASHBOARD_SIDEBAR_COLLAPSED_KEY)?.value);
  const user = await getCurrentUserFromServer();
  const viewer = enforceWorkspaceAccess("brand", user, "/dashboard/brand");
  return <BrandShell navItems={brandNav} user={viewer} initialSidebarCollapsed={initialSidebarCollapsed}>{children}</BrandShell>;
}
