"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";
import type { Role } from "@prisma/client";

type Snapshot = {
  account: { roles: Role[] };
  creatorApplication: null | { status?: string; rejectReason?: string | null };
  brandApplication: null | { status?: string; rejectReason?: string | null };
};

function statusText(value?: string) {
  if (value === "PENDING_REVIEW") return "Đang chờ duyệt";
  if (value === "APPROVED") return "Đã duyệt";
  if (value === "REJECTED") return "Đã từ chối";
  if (value === "NEEDS_REVISION") return "Cần bổ sung";
  return "Chưa gửi";
}

export default function UserRoleRequestsPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/role-upgrade", { cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload.error ?? "Không thể tải trạng thái nâng cấp");
        setData(payload.data as Snapshot);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const roles = data?.account.roles ?? [];
  const isCreator = roles.includes("CREATOR");
  const isBrand = roles.includes("BRAND_OWNER") || roles.includes("BRAND_STAFF");

  return (
    <>
      <PublicHeader />
      <AppShell>
        <PageHeader title="Đăng ký nâng cấp vai trò" subtitle="Theo dõi trạng thái đăng ký Creator/Brand và hành động tiếp theo." />
        {error ? <ErrorState title="Không thể tải dữ liệu" description={error} /> : null}
        {loading ? <div className="h-48 animate-pulse rounded-3xl bg-zinc-100" /> : null}
        {!loading && !data ? <EmptyState title="Không có dữ liệu" description="Vui lòng thử lại sau." /> : null}
        {data ? (
          <section className="grid gap-4 md:grid-cols-2">
            <article className="dc-card p-5">
              <SectionHeader title="Creator" />
              {isCreator ? (
                <div className="space-y-2">
                  <p className="text-sm text-emerald-700">Bạn đã có role Creator.</p>
                  <Link href="/dashboard/creator" className="dc-btn-primary inline-flex">Vào Creator Dashboard</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">Trạng thái: <span className="font-semibold">{statusText(data.creatorApplication?.status)}</span></p>
                  {data.creatorApplication?.rejectReason ? <p className="text-sm text-red-700">Lý do: {data.creatorApplication.rejectReason}</p> : null}
                  <Link href="/dashboard/user/profile#role-requests" className="dc-btn-secondary inline-flex">Mở form đăng ký Creator</Link>
                </div>
              )}
            </article>
            <article className="dc-card p-5">
              <SectionHeader title="Brand" />
              {isBrand ? (
                <div className="space-y-2">
                  <p className="text-sm text-emerald-700">Bạn đã có role Brand.</p>
                  <Link href="/dashboard/brand" className="dc-btn-primary inline-flex">Vào Brand Dashboard</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">Trạng thái: <span className="font-semibold">{statusText(data.brandApplication?.status)}</span></p>
                  {data.brandApplication?.rejectReason ? <p className="text-sm text-red-700">Lý do: {data.brandApplication.rejectReason}</p> : null}
                  <Link href="/dashboard/user/profile#role-requests" className="dc-btn-secondary inline-flex">Mở form đăng ký Brand</Link>
                </div>
              )}
            </article>
          </section>
        ) : null}
      </AppShell>
    </>
  );
}
