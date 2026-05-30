import { redirect } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { WorkspaceChooser } from "@/app/workspace/select/_components/WorkspaceChooser";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { resolveWorkspaceLanding } from "@/lib/auth/workspace-choice";

export default async function WorkspaceSelectPage() {
  const user = await getCurrentUserFromServer();
  if (!user) redirect("/auth/login?next=/workspace/select");

  const decision = resolveWorkspaceLanding({
    roles: user.roles,
    creatorProfile: user.creatorProfile,
    brandMemberships: user.brandMemberships
  });

  if (decision.type === "redirect") {
    redirect(decision.href);
  }

  return (
    <>
      <PublicHeader />
      <WorkspaceChooser
        user={{
          displayName: user.displayName,
          roles: user.roles,
          creatorProfile: user.creatorProfile,
          brandMemberships: user.brandMemberships
        }}
      />
    </>
  );
}
