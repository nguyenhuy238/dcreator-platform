"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const publicNav: NavItem[] = [
  { href: "/campaigns", label: "Campaign" },
  { href: "/dashboard/user", label: "User" },
  { href: "/dashboard/creator", label: "Creator" },
  { href: "/dashboard/brand", label: "Brand" },
  { href: "/admin", label: "Admin" }
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="dc-focus text-xl font-black tracking-tight">dCreator</Link>
        <nav className="hidden items-center gap-5 text-sm text-zinc-600 md:flex">
          {publicNav.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-zinc-900">{item.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="dc-btn-secondary">Đăng nhập</Link>
          <Link href="/auth/register" className="dc-btn-primary hidden sm:inline-flex">Tham gia</Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-20 border-t border-zinc-200 bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 text-sm text-zinc-600 md:grid-cols-3 md:px-6">
        <div>
          <p className="text-base font-bold text-zinc-900">dCreator standalone</p>
          <p className="mt-1">Creator economy + social commerce + campaign sponsorship.</p>
        </div>
        <div>
          <p className="font-semibold text-zinc-900">Sản phẩm</p>
          <p className="mt-1">Campaign, Reward, Mission, Voucher</p>
        </div>
        <div>
          <p className="font-semibold text-zinc-900">Liên hệ</p>
          <p className="mt-1">support@dcreator.vn</p>
        </div>
      </div>
    </footer>
  );
}

export function DashboardSidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-4 lg:block">
      <p className="mb-4 px-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Workspace</p>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`dc-focus mb-2 block rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${pathname === item.href ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"}`}
        >
          {item.label}
        </Link>
      ))}
    </aside>
  );
}

export function MobileBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 border-t border-zinc-200 bg-white lg:hidden">
      {items.slice(0, 4).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`dc-focus px-2 py-3 text-center text-xs font-semibold ${pathname === item.href ? "text-zinc-900" : "text-zinc-500"}`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function AppShell({ children, sidebarItems }: { children: React.ReactNode; sidebarItems: NavItem[] }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl">
      <DashboardSidebar items={sidebarItems} />
      <main className="min-h-screen flex-1 px-4 pb-24 pt-6 md:px-6">{children}</main>
      <MobileBottomNav items={sidebarItems} />
    </div>
  );
}
