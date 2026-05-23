import { NextRequest, NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session-token";

function deny(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function authorize(pathname: string, role: ReturnType<typeof decodeSession>["role"]) {
  if (pathname.startsWith("/admin")) {
    return role === "ADMIN" || role === "OPS";
  }
  if (pathname.startsWith("/dashboard/brand") || pathname.startsWith("/brand")) {
    return role === "BRAND_OWNER" || role === "BRAND_STAFF" || role === "ADMIN" || role === "OPS";
  }
  if (pathname.startsWith("/dashboard/creator")) {
    return role === "CREATOR" || role === "ADMIN" || role === "OPS";
  }
  return true;
}

async function hasCompletedBrandOnboarding(request: NextRequest) {
  const response = await fetch(new URL("/api/brand/dashboard/onboarding", request.url), {
    cache: "no-store",
    headers: {
      cookie: request.headers.get("cookie") ?? ""
    }
  });
  if (!response.ok) return false;
  const payload = (await response.json()) as { success?: boolean; data?: { completed?: boolean } };
  return Boolean(payload?.success && payload?.data?.completed);
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return deny(request);

  try {
    const session = decodeSession(token);
    if (!authorize(request.nextUrl.pathname, session.role)) {
      const url = new URL("/dashboard/user/profile", request.url);
      if (request.nextUrl.pathname.startsWith("/dashboard/creator")) {
        url.searchParams.set("denied", "Bạn cần đăng ký và được duyệt Creator trước khi sử dụng dashboard này.");
      } else if (request.nextUrl.pathname.startsWith("/dashboard/brand")) {
        url.searchParams.set("denied", "Bạn cần đăng ký và được duyệt Brand trước khi sử dụng dashboard này.");
      } else if (request.nextUrl.pathname.startsWith("/admin")) {
        url.searchParams.set("denied", "Bạn không có quyền truy cập khu vực quản trị.");
      }
      return NextResponse.redirect(url);
    }
    const pathname = request.nextUrl.pathname;
    const isBrandWorkspace =
      pathname.startsWith("/dashboard/brand") || pathname.startsWith("/brand");
    const isBrandDashboardHome = pathname === "/dashboard/brand" || pathname === "/dashboard/brand/";
    const isBrandOnboardingPage =
      pathname === "/dashboard/brand/onboarding" || pathname.startsWith("/dashboard/brand/onboarding/");
    if (isBrandWorkspace && !isBrandDashboardHome && !isBrandOnboardingPage) {
      const completed = await hasCompletedBrandOnboarding(request);
      if (!completed) {
        return NextResponse.redirect(new URL("/dashboard/brand/onboarding", request.url));
      }
    }
    if (pathname.startsWith("/wallet") && (session.role === "BRAND_OWNER" || session.role === "BRAND_STAFF")) {
      const completed = await hasCompletedBrandOnboarding(request);
      if (!completed) {
        return NextResponse.redirect(new URL("/dashboard/brand/onboarding", request.url));
      }
    }
    return NextResponse.next();
  } catch {
    return deny(request);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/brand/:path*", "/wallet/:path*"]
};
