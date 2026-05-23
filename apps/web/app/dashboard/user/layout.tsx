import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { enforceWorkspaceAccess } from "@/lib/auth/workspace-guard";

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  enforceWorkspaceAccess("user", user, "/dashboard/user");
  return children;
}
