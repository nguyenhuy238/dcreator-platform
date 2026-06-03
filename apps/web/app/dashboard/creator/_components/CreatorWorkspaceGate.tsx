"use client";

import { useEffect, useState } from "react";
import type { Role } from "@prisma/client";
import { CreatorShell } from "@/app/dashboard/creator/_components/CreatorShell";
import { creatorNav } from "@/app/dashboard/creator/_components/creator-nav";
import { deriveCapabilities, type UserCapabilities } from "@/lib/auth/capabilities";

type WorkspaceUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Role[];
  creatorProfile?: { id: string } | null;
  brandMemberships?: Array<{ id: string; role: "OWNER" | "MANAGER" | "STAFF" }>;
  capabilities?: UserCapabilities;
};

type AuthMePayload = {
  success: boolean;
  data?: { user?: WorkspaceUser };
};

export function CreatorWorkspaceGate({
  children,
  fallback
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [user, setUser] = useState<WorkspaceUser | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function loadMe() {
      try {
        const response = await fetch("/api/auth/me", { cache: "default", signal: controller.signal });
        const payload = (await response.json()) as AuthMePayload;
        if (!active) return;
        if (response.ok && payload.success && payload.data?.user) {
          setUser(payload.data.user);
        } else {
          setUser(null);
        }
      } catch {
        if (active) setUser(null);
      }
    }
    void loadMe();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  if (!user || !user.roles.includes("CREATOR")) {
    return <>{fallback ?? children}</>;
  }

  return (
    <CreatorShell
      navItems={creatorNav}
      user={{
        ...user,
        capabilities: user.capabilities ?? deriveCapabilities({ roles: user.roles, creatorProfile: user.creatorProfile, brandMemberships: user.brandMemberships })
      }}
    >
      {children}
    </CreatorShell>
  );
}
