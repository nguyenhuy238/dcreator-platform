import type { ReactNode } from "react";
import { Header } from "./header";
import { SidebarDashboard } from "./sidebar-dashboard";

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dc-neutral text-dc-text">
      <Header />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[280px,1fr]">
        <aside className="hidden lg:block">
          <SidebarDashboard adminMode />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
