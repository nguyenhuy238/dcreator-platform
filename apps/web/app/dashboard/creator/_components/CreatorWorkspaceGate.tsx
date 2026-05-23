"use client";

import { useEffect, useState } from "react";
import type { Role } from "@prisma/client";
import { CreatorShell } from "@/app/dashboard/creator/_components/CreatorShell";
import { creatorNav } from "@/app/dashboard/creator/_components/creator-nav";

type WorkspaceUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Role[];
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
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<WorkspaceUser | null>(null);

  useEffect(() => {
    let active = true;
    async function loadMe() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const payload = (await response.json()) as AuthMePayload;
        if (!active) return;
        if (response.ok && payload.success && payload.data?.user) {
          setUser(payload.data.user);
        } else {
          setUser(null);
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setReady(true);
      }
    }
    void loadMe();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return <div className="h-28 animate-pulse rounded-2xl bg-zinc-100" />;
  }

  if (!user?.roles.includes("CREATOR")) {
    return <>{fallback ?? children}</>;
  }

  return <CreatorShell navItems={creatorNav} user={user}>{children}</CreatorShell>;
}

