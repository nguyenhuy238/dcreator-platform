import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { enforceWorkspaceAccess } from "@/lib/auth/workspace-guard";
import { BrandShell } from "@/app/dashboard/brand/_components/BrandShell";
import { brandNav } from "@/app/dashboard/brand/_components/brand-nav";

export default async function BrandDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  const viewer = enforceWorkspaceAccess("brand", user, "/dashboard/brand");
  return <BrandShell navItems={brandNav} user={viewer}>{children}</BrandShell>;
}
