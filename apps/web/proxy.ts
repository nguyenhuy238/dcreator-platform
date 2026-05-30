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

async function resolveCurrentRoles(request: NextRequest, fallbackRole: Role): Promise<Role[]> {
  try {
    const response = await fetch(new URL("/api/auth/me", request.url), {
      cache: "no-store",
      headers: {
        cookie: request.headers.get("cookie") ?? ""
      }
    });
    if (!response.ok) return [fallbackRole];
    const payload = (await response.json()) as { success?: boolean; data?: { user?: { roles?: Role[] } } };
    const roles = payload?.data?.user?.roles;
    if (payload?.success && Array.isArray(roles) && roles.length > 0) {
      return roles;
    }
  } catch {
    // fallback below
  }
  return [fallbackRole];
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/brand/register") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return deny(request);

  try {
    const session = decodeSession(token);
    const roles = await resolveCurrentRoles(request, session.role);
    const workspace = getWorkspaceForPath(request.nextUrl.pathname);
    if (!canAccessWorkspaceByRoles(workspace, roles)) {
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
