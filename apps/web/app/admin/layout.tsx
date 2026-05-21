import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { adminNav } from "@/app/admin/_components/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={[...adminNav]}>{children}</AppShell>
    </>
  );
}
