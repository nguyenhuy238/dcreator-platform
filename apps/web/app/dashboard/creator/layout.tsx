import { redirect } from "next/navigation";
import { CreatorShell } from "@/app/dashboard/creator/_components/CreatorShell";
import { creatorNav } from "@/app/dashboard/creator/_components/creator-nav";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { hasRole } from "@/lib/auth/dashboard-access";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";

export default async function CreatorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserFromServer();
  if (!user) redirect("/auth/login?next=/dashboard/creator");
  if (!hasRole(user.roles, DASHBOARD_ACCESS.creator)) {
    redirect("/dashboard/user/profile?denied=Bạn cần đăng ký và được duyệt Creator trước khi sử dụng bảng điều khiển Creator.");
  }

  return <CreatorShell navItems={creatorNav} user={user}>{children}</CreatorShell>;
}
