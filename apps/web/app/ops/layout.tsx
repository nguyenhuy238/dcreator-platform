import { redirect } from "next/navigation";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { hasRole } from "@/lib/auth/dashboard-access";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  if (!user) redirect("/auth/login?next=/ops");
  if (!hasRole(user.roles, DASHBOARD_ACCESS.admin)) {
    redirect("/dashboard/user/settings?denied=Bạn không có quyền truy cập khu vực vận hành.");
  }
  return children;
}
