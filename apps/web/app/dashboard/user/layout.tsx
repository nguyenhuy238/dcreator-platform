import { redirect } from "next/navigation";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { hasRole } from "@/lib/auth/dashboard-access";

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  if (!user) redirect("/auth/login?next=/dashboard/user");
  if (!hasRole(user.roles, DASHBOARD_ACCESS.user)) redirect("/dashboard/user/profile?denied=Bạn không có quyền truy cập User Dashboard.");
  return children;
}
