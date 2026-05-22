import { redirect } from "next/navigation";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { hasRole } from "@/lib/auth/dashboard-access";

export default async function CreatorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  if (!user) redirect("/auth/login?next=/dashboard/creator");
  if (!hasRole(user.roles, DASHBOARD_ACCESS.creator)) {
    redirect("/dashboard/user/profile?denied=Bạn cần đăng ký và được duyệt Creator trước khi sử dụng Creator Dashboard.");
  }
  return children;
}
