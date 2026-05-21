"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const publicNav: NavItem[] = [
  { href: "/campaigns", label: "Chiến dịch" },
  { href: "/auth/register/creator", label: "Creator" },
  { href: "/auth/register/brand", label: "Brand" }
];

export function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center px-4 py-3 md:px-6">
        <Link href="/" className="dc-focus inline-flex items-center gap-2 text-2xl font-black tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
            <span className="text-[15px] font-black leading-none tracking-[-0.08em]">d</span>
          </span>
          <span>dCreator</span>
        </Link>
        <nav className="hidden w-full max-w-lg grid-cols-3 items-center justify-self-end text-center text-sm text-zinc-600 md:grid md:mr-6">
          {publicNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full rounded-xl py-2 transition hover:bg-zinc-200 hover:text-zinc-950 ${
                pathname === item.href || pathname.startsWith(`${item.href}/`) ? "bg-zinc-200 text-zinc-950" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-2">
          <Link href="/auth/login" className="dc-btn-secondary">Đăng nhập</Link>
          <Link href="/auth/register" className="dc-btn-primary hidden px-7 py-3 text-base sm:inline-flex">Đăng ký tài khoản</Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-20 bg-zinc-950 text-zinc-300">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="border-b border-white/10 pb-8">
          <div className="flex flex-col gap-8 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-4xl font-black tracking-tight text-white md:text-5xl">dCreator</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Kết nối Creator và Brand để tăng trưởng bằng nội dung, minh bạch và hiệu quả.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">Creator</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">Brand</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">Campaign</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">Social commerce</span>
            </div>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Tổng hợp</p>
              <div className="mt-3 grid gap-2 text-sm text-zinc-400">
                <p>Creator tìm job</p>
                <p>Brand tăng doanh thu</p>
                <p>Chiến dịch minh bạch</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Liên kết nhanh</p>
              <div className="mt-3 grid gap-2 text-sm">
                <Link href="/campaigns" className="transition hover:text-white">Chiến dịch</Link>
                <Link href="/auth/register/creator" className="transition hover:text-white">Creator</Link>
                <Link href="/auth/register/brand" className="transition hover:text-white">Brand</Link>
              </div>
            </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Liên hệ</p>
              <div className="mt-3 grid gap-2 text-sm text-zinc-400">
                <a href="mailto:support@dcreator.vn" className="inline-flex w-fit items-center gap-2 transition hover:text-white">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 ring-1 ring-zinc-300">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current text-zinc-900">
                      <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v.2l8 5.3 8-5.3V7H4zm16 10V9.6l-7.4 4.9a1 1 0 0 1-1.2 0L4 9.6V17h16z" />
                    </svg>
                  </span>
                  <span>support@dcreator.vn</span>
                </a>
                <a
                  href="https://facebook.com/dcreator.vn"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="inline-flex w-fit items-center gap-2 transition hover:text-white"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 ring-1 ring-zinc-300">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current text-zinc-900">
                      <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.4c0-.9.3-1.5 1.6-1.5h1.8V4c-.3 0-1.3-.1-2.5-.1-2.6 0-4.4 1.6-4.4 4.6v2.1H7v3.2h2.5V22h4z" />
                    </svg>
                  </span>
                </a>
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 ring-1 ring-zinc-300">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current text-zinc-900">
                      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.1 7 13 7 13s7-7.9 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
                    </svg>
                  </span>
                  <span>Vietnam, Social Commerce Platform</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between">
            <p>© 2026 dCreator. All rights reserved.</p>
            <p>Creator economy · Brand growth · Social commerce</p>
          </div>
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
