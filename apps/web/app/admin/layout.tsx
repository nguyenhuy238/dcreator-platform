import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { adminNav } from "@/app/admin/_components/admin-nav";
import { redirect } from "next/navigation";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { hasRole } from "@/lib/auth/dashboard-access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  if (!user) redirect("/auth/login?next=/admin");
  if (!hasRole(user.roles, DASHBOARD_ACCESS.admin)) {
    redirect("/dashboard/user/profile?denied=Bạn không có quyền truy cập khu vực quản trị.");
  }
  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={[...adminNav]}>{children}</AppShell>
    </>
  );
}
