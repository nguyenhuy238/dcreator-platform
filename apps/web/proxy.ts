import { NextRequest, NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session-token";
import { canAccessWorkspaceByRoles, deniedWorkspaceMessage } from "@/lib/auth/workspace-guard";
import { getWorkspaceForPath } from "@/lib/navigation";
import type { Role } from "@prisma/client";

function deny(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

type ResolvedAccessContext = {
  roles: Role[];
  creatorProfile?: { id: string } | null;
  brandMemberships?: Array<{ id: string; role: "OWNER" | "STAFF" }>;
};

async function resolveCurrentAccessContext(request: NextRequest, fallbackRole: Role): Promise<ResolvedAccessContext> {
  try {
    const response = await fetch(new URL("/api/auth/me", request.url), {
      cache: "no-store",
      headers: {
        cookie: request.headers.get("cookie") ?? ""
      }
    });
    if (!response.ok) return { roles: [fallbackRole] };
    const payload = (await response.json()) as {
      success?: boolean;
      data?: {
        user?: {
          roles?: Role[];
          creatorProfile?: { id: string } | null;
          brandMemberships?: Array<{ id: string; role: "OWNER" | "STAFF" }>;
        };
      };
    };
    const roles = payload?.data?.user?.roles;
    const creatorProfile = payload?.data?.user?.creatorProfile;
    const brandMemberships = payload?.data?.user?.brandMemberships;
    if (payload?.success && Array.isArray(roles) && roles.length > 0) {
      return { roles, creatorProfile, brandMemberships };
    }
  } catch {
    // fallback below
  }
  return { roles: [fallbackRole] };
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/brand/register") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return deny(request);

  try {
    const session = decodeSession(token);
    const { roles, creatorProfile, brandMemberships } = await resolveCurrentAccessContext(request, session.role);
    const workspace = getWorkspaceForPath(request.nextUrl.pathname);
    if (!canAccessWorkspaceByRoles(workspace, roles, { creatorProfile, brandMemberships })) {
      const url = new URL("/dashboard/user", request.url);
      url.searchParams.set("denied", deniedWorkspaceMessage(workspace));
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  } catch {
    return deny(request);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/ops/:path*", "/brand/:path*", "/wallet/:path*"]
};
