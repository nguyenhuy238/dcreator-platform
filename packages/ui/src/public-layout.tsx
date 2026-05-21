import type { ReactNode } from "react";
import { Header } from "./header";
import { MobileBottomNav } from "./mobile-bottom-nav";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dc-subtle text-dc-text">
      <Header ctaLabel="Tham gia" />
      <main className="mx-auto w-full max-w-6xl px-4 py-4 pb-24 md:pb-6">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
