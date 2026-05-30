import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import type { CurrentUser } from "@/lib/auth/current-user";
import { deriveCapabilities } from "@/lib/auth/capabilities";
import type { Workspace } from "@/lib/navigation";
import { canAccessWorkspace } from "@/lib/navigation";

export function canAccessWorkspaceByRoles(
  workspace: Workspace,
  roles: Role[],
  context?: { creatorProfile?: { id: string } | null; brandMemberships?: Array<{ id: string; role: "OWNER" | "MANAGER" | "STAFF" }> }
) {
  const capabilities = deriveCapabilities({
    roles,
    creatorProfile: context?.creatorProfile,
    brandMemberships: context?.brandMemberships
  });
  return canAccessWorkspace(workspace, { roles, capabilities });
}

export function deniedWorkspaceMessage(workspace: Workspace) {
  if (workspace === "creator") return "Bạn chưa có quyền truy cập khu vực này.";
  if (workspace === "brand") return "Bạn chưa thuộc Brand nào. Vui lòng tạo Brand mới để vào Brand Dashboard.";
  if (workspace === "admin") return "Bạn chưa có quyền truy cập khu vực này.";
  return "Bạn chưa có quyền truy cập khu vực này.";
}

export function enforceWorkspaceAccess(workspace: Workspace, user: CurrentUser | null, loginNext: string) {
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(loginNext)}`);
  }
  if (!canAccessWorkspaceByRoles(workspace, user.roles, { creatorProfile: user.creatorProfile, brandMemberships: user.brandMemberships })) {
    const denied = encodeURIComponent(deniedWorkspaceMessage(workspace));
    redirect(`/dashboard/user?denied=${denied}`);
  }
  return user;
}
