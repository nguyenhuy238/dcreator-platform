"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { getAvailableDashboards } from "@/lib/auth/dashboard-access";

export function DashboardSwitcher({ roles }: { roles: Role[] }) {
  const pathname = usePathname();
  const dashboards = getAvailableDashboards(roles);
  if (dashboards.length <= 1) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {dashboards.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.id} href={item.href} className={active ? "dc-btn-primary" : "dc-btn-secondary"}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
