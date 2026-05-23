import { AdminShell } from "@/app/admin/_components/AdminShell";
import { adminNav } from "@/app/admin/_components/admin-nav";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { enforceWorkspaceAccess } from "@/lib/auth/workspace-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  const viewer = enforceWorkspaceAccess("admin", user, "/admin");
  return <AdminShell navItems={adminNav} user={viewer}>{children}</AdminShell>;
}
