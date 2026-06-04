"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import type { UserCapabilities } from "@/lib/auth/capabilities";
import { getAvailableWorkspaces, getWorkspaceForPath } from "@/lib/navigation";

export function DashboardSwitcher({
  roles,
  capabilities,
  className = "mb-4"
}: {
  roles: Role[];
  capabilities: UserCapabilities;
  className?: string;
}) {
  const pathname = usePathname();
  const workspaces = getAvailableWorkspaces({ roles, capabilities });
  const currentWorkspace = useMemo(() => getWorkspaceForPath(pathname), [pathname]);
  const current = workspaces.find((workspace) => workspace.id === currentWorkspace) ?? workspaces[0];
  if (workspaces.length <= 1 || !current) return null;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <label htmlFor="workspace-switcher" className="text-sm font-semibold text-zinc-700">
        Chuyển workspace
      </label>
      <select
        id="workspace-switcher"
        className="dc-input max-w-xs"
        value={current.id}
        onChange={(event) => {
          const target = workspaces.find((workspace) => workspace.id === event.target.value);
          if (target) window.location.href = target.href;
        }}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.label}
          </option>
        ))}
      </select>
    </div>
  );
}
