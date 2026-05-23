import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { enforceWorkspaceAccess } from "@/lib/auth/workspace-guard";

export default async function DashboardAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  enforceWorkspaceAccess("admin", user, "/dashboard/admin");
  return children;
}
