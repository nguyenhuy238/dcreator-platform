"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import type { AdminNavItem } from "@/app/admin/_components/admin-nav";

type AdminShellUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: Role[];
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function toBreadcrumb(pathname: string, nav: readonly AdminNavItem[]) {
  if (pathname === "/admin") return [{ href: "/admin", label: "Tổng quan" }];
  const segments = pathname.split("/").filter(Boolean);
  const trails: Array<{ href: string; label: string }> = [];
  for (let i = 0; i < segments.length; i += 1) {
    const href = `/${segments.slice(0, i + 1).join("/")}`;
    const navLabel = nav.find((item) => item.href === href)?.label;
    trails.push({
      href,
      label: navLabel ?? segments[i]!.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    });
  }
  return trails;
}

export function AdminShell({
  children,
  navItems,
  user
}: {
  children: React.ReactNode;
  navItems: readonly AdminNavItem[];
  user: AdminShellUser;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const crumbs = useMemo(() => toBreadcrumb(pathname, navItems), [pathname, navItems]);
  const activeTitle = navItems.find((item) => isCurrent(pathname, item.href))?.label ?? "Admin";
  const userInitials = initials(user.displayName || user.email || "A");

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/auth/login?next=/admin";
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 border-r border-zinc-200 bg-white lg:block">
          <div className="border-b border-zinc-200 px-5 py-4">
            <p className="text-sm font-black text-zinc-900">dCreator Admin</p>
            <p className="mt-1 text-xs text-zinc-500">Ops and moderation workspace</p>
          </div>
          <nav className="h-[calc(100vh-73px)] overflow-y-auto p-3">
            {navItems.map((item) => {
              const active = isCurrent(pathname, item.href);
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={`mb-1 block rounded-xl border px-3 py-2.5 transition ${
                    active ? "border-zinc-900 bg-zinc-900 text-white" : "border-transparent text-zinc-700 hover:border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.label}</p>
                    {item.isComingSoon ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"}`}>
                        SOON
                      </span>
                    ) : null}
                  </div>
                  {item.description ? <p className={`mt-0.5 text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>{item.description}</p> : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
            <div className="px-4 py-3 md:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 lg:hidden"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open admin navigation"
                  >
                    ☰
                  </button>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{activeTitle}</p>
                    <nav className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
                      {crumbs.map((crumb, index) => (
                        <span key={crumb.href} className="inline-flex items-center gap-1">
                          {index > 0 ? <span>/</span> : null}
                          <Link href={crumb.href} className="hover:text-zinc-900">{crumb.label}</Link>
                        </span>
                      ))}
                    </nav>
                  </div>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1.5 hover:bg-zinc-100"
                    onClick={() => setMenuOpen((prev) => !prev)}
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                      {userInitials}
                    </span>
                    <span className="hidden text-sm font-semibold text-zinc-800 sm:inline">{user.displayName}</span>
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
                      <div className="rounded-lg bg-zinc-50 px-3 py-2">
                        <p className="text-sm font-semibold text-zinc-900">{user.displayName}</p>
                        <p className="truncate text-xs text-zinc-500">{user.email}</p>
                        <p className="mt-1 text-xs text-zinc-500">Roles: {user.roles.join(", ")}</p>
                      </div>
                      <div className="mt-2 grid gap-1">
                        <Link href="/dashboard/user/profile" className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">Profile</Link>
                        <button type="button" onClick={onLogout} className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50">
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 pb-10 pt-5 md:px-6">{children}</main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-80 max-w-[85vw] bg-white p-3" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between border-b border-zinc-200 pb-3">
              <p className="font-black text-zinc-900">Admin Navigation</p>
              <button type="button" className="rounded-lg border border-zinc-200 px-2 py-1 text-sm" onClick={() => setMobileOpen(false)}>Close</button>
            </div>
            <nav>
              {navItems.map((item) => (
                <Link
                  key={`${item.href}-${item.label}-mobile`}
                  href={item.href}
                  className={`mb-1 block rounded-xl px-3 py-2.5 text-sm font-semibold ${isCurrent(pathname, item.href) ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
