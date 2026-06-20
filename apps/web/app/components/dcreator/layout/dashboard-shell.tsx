"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  Bank,
  List,
  Bell,
  Briefcase,
  CheckCircle,
  ClipboardText,
  Coins,
  Gauge,
  GearSix,
  Gift,
  House,
  IdentificationCard,
  ListChecks,
  Megaphone,
  X,
  Package,
  Scroll,
  ShieldWarning,
  SlidersHorizontal,
  Storefront,
  Ticket,
  UserCircle,
  UserPlus,
  Wallet,
  UsersThree,
} from "@phosphor-icons/react";
import { getBreadcrumbsForPath, getWorkspaceForPath } from "@/lib/navigation";
import { resolveImageUrl } from "@/lib/images/resolve-image-url";
import { DASHBOARD_SIDEBAR_COLLAPSED_KEY } from "@/lib/dashboard-sidebar";

export type DashboardNavItem = {
  href: string;
  label: string;
  description?: string;
  isComingSoon?: boolean;
  disabled?: boolean;
  badge?: number;
  priority?: "critical" | "high" | "normal";
  icon?: string;
  activePrefixes?: readonly string[];
};
export type DashboardNavGroup = {
  title: string;
  items: readonly DashboardNavItem[];
};

type DashboardShellUser = {
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

function getActiveHref(pathname: string, nav: readonly DashboardNavItem[]) {
  const candidates = nav
    .filter((item) => {
      const matchedByPrefix = item.activePrefixes?.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );
      return isCurrent(pathname, item.href) || Boolean(matchedByPrefix);
    })
    .sort((a, b) => b.href.length - a.href.length);
  return candidates[0]?.href ?? null;
}

function isNavGroup(
  item: DashboardNavItem | DashboardNavGroup,
): item is DashboardNavGroup {
  return "items" in item;
}

function flattenNav(
  navItems: readonly (DashboardNavItem | DashboardNavGroup)[],
) {
  return navItems.flatMap((item) => (isNavGroup(item) ? item.items : [item]));
}

const iconMap = {
  Bank,
  Bell,
  Briefcase,
  CheckCircle,
  ClipboardText,
  Coins,
  Gauge,
  GearSix,
  Gift,
  House,
  IdentificationCard,
  ListChecks,
  Megaphone,
  Package,
  Scroll,
  ShieldWarning,
  SlidersHorizontal,
  Storefront,
  Ticket,
  UserCircle,
  UserPlus,
  Wallet,
  UsersThree,
} as const;

export function DashboardShell({
  children,
  navItems,
  user,
  workspaceTitle,
  workspaceDescription,
  loginRedirect,
  initialSidebarCollapsed = false,
  headerAccessory,
}: {
  children: React.ReactNode;
  navItems: readonly (DashboardNavItem | DashboardNavGroup)[];
  user: DashboardShellUser;
  workspaceTitle: string;
  workspaceDescription: string;
  loginRedirect: string;
  initialSidebarCollapsed?: boolean;
  headerAccessory?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialSidebarCollapsed);
  const workspace = useMemo(() => getWorkspaceForPath(pathname), [pathname]);
  const crumbs = useMemo(
    () => getBreadcrumbsForPath(pathname, workspace),
    [pathname, workspace],
  );
  const flatNavItems = useMemo(() => flattenNav(navItems), [navItems]);
  const activeHref = useMemo(
    () => getActiveHref(pathname, flatNavItems),
    [pathname, flatNavItems],
  );
  const activeTitle =
    flatNavItems.find((item) => item.href === activeHref)?.label ??
    workspaceTitle;
  const userInitials = initials(user.displayName || user.email || "U");
  const userAvatarSrc = useMemo(
    () => resolveImageUrl(user.avatarUrl, ""),
    [user.avatarUrl],
  );
  const profileHref = useMemo(() => {
    if (workspace === "admin") return "/admin";
    if (workspace === "brand") return "/dashboard/brand";
    if (workspace === "creator") return "/dashboard/creator";
    return "/dashboard/user/settings";
  }, [workspace]);

  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_SIDEBAR_COLLAPSED_KEY,
      collapsed ? "true" : "false",
    );
    document.cookie = `${DASHBOARD_SIDEBAR_COLLAPSED_KEY}=${collapsed ? "true" : "false"}; path=/; max-age=31536000; SameSite=Lax`;
  }, [collapsed]);

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = `/auth/login?next=${encodeURIComponent(loginRedirect)}`;
    }
  }

  return (
    <div className="min-h-dvh bg-zinc-50">
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-dvh shrink-0 border-r border-zinc-200 bg-white transition-[width] duration-300 ease-in-out will-change-[width] lg:block ${collapsed ? "w-[72px]" : "w-[320px]"}`}
      >
        <div
          className={`flex h-[73px] items-center border-b border-zinc-200 transition-[padding] duration-300 ease-in-out ${collapsed ? "justify-center px-2" : "px-5"}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="inline-flex shrink-0 items-center"
              aria-label="Về trang chủ dCreator"
            >
              <Image
                src="/uploads/dCreator-logo-new.png"
                alt="dCreator logo"
                width={120}
                height={32}
                className={
                  collapsed ? "h-8 w-8 rounded-lg object-cover" : "h-8 w-auto"
                }
                style={collapsed ? undefined : { width: "auto" }}
                priority
              />
            </Link>
            <div
              className={`min-w-0 overflow-hidden transition-[width,opacity] duration-300 ease-in-out ${collapsed ? "w-0 opacity-0" : "w-48 opacity-100"}`}
            >
              <p className="truncate text-sm font-black text-zinc-900">
                {workspaceTitle}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500">
                {workspaceDescription}
              </p>
            </div>
          </div>
        </div>
        <nav className="h-[calc(100dvh-73px)] overflow-y-auto p-2">
          {navItems.map((entry) => {
            if (isNavGroup(entry)) {
              return (
                <div key={entry.title} className="mb-3">
                  <p
                    className={`px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400 transition-opacity duration-300 ${collapsed ? "h-0 overflow-hidden p-0 opacity-0" : "opacity-100"}`}
                  >
                    {entry.title}
                  </p>
                  <div className="grid gap-1">
                    {entry.items.map((item) => {
                      const active = item.href === activeHref;
                      const label = item.label?.trim() || "Đi tới trang";
                      const Icon =
                        iconMap[item.icon as keyof typeof iconMap] ?? House;
                      const disabled = item.disabled || item.isComingSoon;
                      const itemClass = `dc-focus relative flex min-h-11 items-center overflow-hidden rounded-2xl border transition-colors duration-200 ${collapsed ? "justify-center px-0 py-2" : "px-3 py-2.5"} ${active ? "border-zinc-900 bg-zinc-900 shadow-sm hover:bg-zinc-900" : "border-transparent bg-transparent hover:border-zinc-200 hover:bg-zinc-100"} ${disabled ? "pointer-events-none opacity-55" : ""}`;
                      const content = (
                        <>
                          <Icon
                            size={collapsed ? 20 : 18}
                            weight={active ? "fill" : "regular"}
                            className={`shrink-0 ${active ? "text-white" : "text-zinc-700"}`}
                          />
                          <span
                            className={`ml-2 min-w-0 overflow-hidden transition-[width,opacity] duration-300 ease-in-out ${collapsed ? "w-0 opacity-0" : "w-full opacity-100"}`}
                          >
                            <span className="flex min-w-0 items-center justify-between gap-2">
                              <span
                                className={`relative z-10 truncate text-sm font-semibold leading-5 ${active ? "text-white" : "text-zinc-900"}`}
                              >
                                {label}
                              </span>
                              <span className="relative z-10 flex shrink-0 items-center gap-1">
                                {typeof item.badge === "number" ? (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? "bg-white text-zinc-900" : item.priority === "critical" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}
                                  >
                                    {item.badge}
                                  </span>
                                ) : null}
                                {item.isComingSoon ? (
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${active ? "border-white/20 bg-white/10 text-white" : "border-zinc-200 bg-zinc-200 text-zinc-700"}`}
                                  >
                                    Sắp có
                                  </span>
                                ) : null}
                              </span>
                            </span>
                            {item.description ? (
                              <span
                                className={`relative z-10 mt-0.5 block truncate text-xs leading-4 ${active ? "text-zinc-300" : "text-zinc-500"}`}
                              >
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                        </>
                      );
                      return disabled ? (
                        <span
                          key={`${item.href}-${item.label}`}
                          title={collapsed ? label : undefined}
                          className={itemClass}
                          aria-disabled="true"
                        >
                          {content}
                        </span>
                      ) : (
                        <Link
                          key={`${item.href}-${item.label}`}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          title={collapsed ? label : undefined}
                          className={itemClass}
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }
            const item = entry;
            const active = item.href === activeHref;
            const label = item.label?.trim() || "Đi tới trang";
            const Icon = iconMap[item.icon as keyof typeof iconMap] ?? House;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
                className={`dc-focus relative mb-1 flex min-h-11 items-center overflow-hidden rounded-2xl border transition-colors duration-200 ${collapsed ? "justify-center px-0 py-2" : "px-3 py-2.5"} ${active ? "border-zinc-900 bg-zinc-900 shadow-sm hover:bg-zinc-900" : "border-transparent bg-transparent hover:border-zinc-200 hover:bg-zinc-100"}`}
              >
                <Icon
                  size={collapsed ? 20 : 18}
                  weight={active ? "fill" : "regular"}
                  className={`shrink-0 ${active ? "text-white" : "text-zinc-700"}`}
                />
                <span
                  className={`ml-2 min-w-0 overflow-hidden transition-[width,opacity] duration-300 ease-in-out ${collapsed ? "w-0 opacity-0" : "w-full opacity-100"}`}
                >
                  <span className="flex min-w-0 items-center justify-between gap-2">
                    <span
                      className={`relative z-10 truncate text-sm font-semibold leading-5 ${active ? "text-white" : "text-zinc-900"}`}
                    >
                      {label}
                    </span>
                    {item.isComingSoon ? (
                      <span
                        className={`relative z-10 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${active ? "border-white/20 bg-white/10 text-white" : "border-zinc-200 bg-zinc-200 text-zinc-700"}`}
                      >
                        SOON
                      </span>
                    ) : null}
                  </span>
                  {item.description ? (
                    <span
                      className={`relative z-10 mt-0.5 block truncate text-xs leading-4 ${active ? "text-zinc-300" : "text-zinc-500"}`}
                    >
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div
        className={`min-w-0 overflow-x-hidden transition-[padding-left] duration-300 ease-in-out ${collapsed ? "lg:pl-[72px]" : "lg:pl-[320px]"}`}
      >
        <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
          <div className="px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex flex-1 items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Mở thanh điều hướng"
                >
                  ☰
                </button>
                <button
                  type="button"
                  className="hidden h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100 lg:inline-flex"
                  onClick={() => setCollapsed((prev) => !prev)}
                  aria-label={
                    collapsed
                      ? "Mở thanh điều hướng"
                      : "Thu gọn thanh điều hướng"
                  }
                  aria-pressed={collapsed}
                >
                  {collapsed ? (
                    <List size={18} weight="bold" />
                  ) : (
                    <X size={18} weight="bold" />
                  )}
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-900">
                    {activeTitle}
                  </p>
                  <nav className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
                    {crumbs.map((crumb, index) => (
                      <span
                        key={crumb.href}
                        className="inline-flex items-center gap-1"
                      >
                        {index > 0 ? <span>/</span> : null}
                        <Link href={crumb.href} className="hover:text-zinc-900">
                          {crumb.label}
                        </Link>
                      </span>
                    ))}
                  </nav>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {headerAccessory}
                <div className="relative">
                  <button
                    type="button"
                    className="inline-flex max-w-[42vw] items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1.5 hover:bg-zinc-100 sm:max-w-xs"
                    onClick={() => setMenuOpen((prev) => !prev)}
                  >
                    {userAvatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={userAvatarSrc}
                        alt={user.displayName}
                        className="h-7 w-7 rounded-full border border-zinc-200 bg-zinc-100 object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                        {userInitials}
                      </span>
                    )}
                    <span className="hidden max-w-36 truncate text-sm font-semibold text-zinc-800 sm:inline">
                      {user.displayName}
                    </span>
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
                      <div className="rounded-lg bg-zinc-50 px-3 py-2">
                        <p className="text-sm font-semibold text-zinc-900">
                          {user.displayName}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {user.email}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Vai trò: {user.roles.join(", ")}
                        </p>
                      </div>
                      <div className="mt-2 grid gap-1">
                        <Link
                          href={profileHref}
                          className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                        >
                          Hồ sơ
                        </Link>
                        <button
                          type="button"
                          onClick={onLogout}
                          className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="min-w-0 px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-5 md:px-6">
          {children}
        </main>
      </div>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="h-full w-80 max-w-[85vw] overflow-y-auto bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center"
                  aria-label="Về trang chủ dCreator"
                  onClick={() => setMobileOpen(false)}
                >
                  <Image
                    src="/uploads/dCreator-logo-new.png"
                    alt="dCreator logo"
                    width={120}
                    height={32}
                    className="h-8 w-auto"
                    style={{ width: "auto" }}
                  />
                </Link>
                <p className="truncate font-black text-zinc-900">
                  {workspaceTitle}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                onClick={() => setMobileOpen(false)}
              >
                Đóng
              </button>
            </div>
            <p className="mb-3 text-xs text-zinc-500">{workspaceDescription}</p>
            <nav>
              {navItems.map((entry) => {
                if (isNavGroup(entry)) {
                  return (
                    <div key={`${entry.title}-mobile`} className="mb-4">
                      <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
                        {entry.title}
                      </p>
                      <div className="grid gap-1">
                        {entry.items.map((item) => {
                          const active = item.href === activeHref;
                          const Icon =
                            iconMap[item.icon as keyof typeof iconMap] ?? House;
                          const disabled = item.disabled || item.isComingSoon;
                          const content = (
                            <>
                              <span
                                className={`relative z-10 flex min-w-0 items-center gap-2 ${active ? "text-white" : "text-zinc-900"}`}
                              >
                                <Icon
                                  size={18}
                                  weight={active ? "fill" : "regular"}
                                  className="shrink-0"
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {item.label?.trim() || "Đi tới trang"}
                                </span>
                                {typeof item.badge === "number" ? (
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${active ? "bg-white text-zinc-900" : "bg-zinc-100 text-zinc-700"}`}
                                  >
                                    {item.badge}
                                  </span>
                                ) : null}
                                {item.isComingSoon ? (
                                  <span
                                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${active ? "border-white/20 bg-white/10 text-white" : "border-zinc-200 bg-zinc-200 text-zinc-700"}`}
                                  >
                                    Sắp có
                                  </span>
                                ) : null}
                              </span>
                              {item.description ? (
                                <span
                                  className={`mt-1 block truncate pl-6 text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}
                                >
                                  {item.description}
                                </span>
                              ) : null}
                            </>
                          );
                          const className = `dc-focus min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold leading-5 ${active ? "bg-zinc-900 hover:bg-zinc-900" : "text-zinc-700 hover:bg-zinc-100"} ${disabled ? "pointer-events-none opacity-55" : ""}`;
                          return disabled ? (
                            <span
                              key={`${item.href}-${item.label}-mobile`}
                              className={className}
                              aria-disabled="true"
                            >
                              {content}
                            </span>
                          ) : (
                            <Link
                              key={`${item.href}-${item.label}-mobile`}
                              href={item.href}
                              aria-current={active ? "page" : undefined}
                              className={className}
                              onClick={() => setMobileOpen(false)}
                            >
                              {content}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                const item = entry;
                const active = item.href === activeHref;
                const Icon =
                  iconMap[item.icon as keyof typeof iconMap] ?? House;
                return (
                  <Link
                    key={`${item.href}-${item.label}-mobile`}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`dc-focus mb-1 block min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold leading-5 ${active ? "bg-zinc-900 hover:bg-zinc-900" : "text-zinc-700 hover:bg-zinc-100"}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span
                      className={`relative z-10 flex items-center gap-2 ${active ? "text-white" : "text-zinc-900"}`}
                    >
                      <Icon size={18} weight={active ? "fill" : "regular"} />
                      {item.label?.trim() || "Đi tới trang"}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
