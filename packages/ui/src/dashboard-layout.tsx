import type { ReactNode } from "react";
import { Header } from "./header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { SidebarDashboard } from "./sidebar-dashboard";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dc-subtle text-dc-text">
      <Header />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[240px,1fr]">
        <aside className="hidden md:block">
          <SidebarDashboard />
        </aside>
        <main className="pb-24 md:pb-6">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
