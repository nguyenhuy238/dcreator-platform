import { NextRequest, NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session-token";

function deny(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function authorize(pathname: string, role: ReturnType<typeof decodeSession>["role"]) {
  void pathname;
  void role;
  return true;
}

export function proxy(request: NextRequest) {
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
    return NextResponse.next();
  } catch {
    return deny(request);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"]
};
