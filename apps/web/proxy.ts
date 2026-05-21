import { NextRequest, NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session-token";
import { hasAtLeastRole, hasSomeRole } from "@/lib/auth/roles";

function deny(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function authorize(pathname: string, role: ReturnType<typeof decodeSession>["role"]) {
  if (pathname.startsWith("/dashboard/user")) {
    return hasAtLeastRole(role, "USER");
  }
  if (pathname.startsWith("/dashboard/creator")) {
    return hasSomeRole(role, ["CREATOR"]);
  }
  if (pathname.startsWith("/dashboard/brand")) {
    return hasSomeRole(role, ["BRAND_OWNER", "BRAND_STAFF"]);
  }
  if (pathname.startsWith("/admin")) {
    return hasSomeRole(role, ["ADMIN", "OPS"]);
  }
  return true;
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return deny(request);

  try {
    const session = decodeSession(token);
    if (!authorize(request.nextUrl.pathname, session.role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  } catch {
    return deny(request);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
  runtime: "nodejs"
};
