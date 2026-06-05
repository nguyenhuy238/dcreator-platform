import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { enforceWorkspaceAccess } from "@/lib/auth/workspace-guard";
import { UserDashboardShell } from "./_components/UserDashboardShell";

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  enforceWorkspaceAccess("user", user, "/dashboard/user");
  return <UserDashboardShell>{children}</UserDashboardShell>;
}
