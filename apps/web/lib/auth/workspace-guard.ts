import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { Workspace } from "@/lib/navigation";
import { canAccessWorkspace } from "@/lib/navigation";

export function canAccessWorkspaceByRoles(workspace: Workspace, roles: Role[]) {
  return canAccessWorkspace(workspace, roles);
}

export function deniedWorkspaceMessage(workspace: Workspace) {
  if (workspace === "creator") return "Bạn chưa có quyền truy cập khu vực này.";
  if (workspace === "brand") return "Bạn chưa có quyền truy cập khu vực này.";
  if (workspace === "admin") return "Bạn chưa có quyền truy cập khu vực này.";
  return "Bạn chưa có quyền truy cập khu vực này.";
}

export function enforceWorkspaceAccess(workspace: Workspace, user: CurrentUser | null, loginNext: string) {
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(loginNext)}`);
  }
  if (!canAccessWorkspaceByRoles(workspace, user.roles)) {
    const denied = encodeURIComponent(deniedWorkspaceMessage(workspace));
    redirect(`/dashboard/user?denied=${denied}`);
  }
  return user;
}
