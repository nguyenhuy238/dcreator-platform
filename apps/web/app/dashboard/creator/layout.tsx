import { CreatorShell } from "@/app/dashboard/creator/_components/CreatorShell";
import { creatorNav } from "@/app/dashboard/creator/_components/creator-nav";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { enforceWorkspaceAccess } from "@/lib/auth/workspace-guard";

export default async function CreatorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  const viewer = enforceWorkspaceAccess("creator", user, "/dashboard/creator");
  return <CreatorShell navItems={creatorNav} user={viewer}>{children}</CreatorShell>;
}
