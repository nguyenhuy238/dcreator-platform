import { redirect } from "next/navigation";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { hasRole } from "@/lib/auth/dashboard-access";

export default async function BrandDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  if (!user) redirect("/auth/login?next=/dashboard/brand");
  if (!hasRole(user.roles, DASHBOARD_ACCESS.brand)) {
    redirect("/dashboard/user/profile?denied=Bạn cần đăng ký và được duyệt Brand trước khi sử dụng Brand Dashboard.");
  }
  return children;
}
