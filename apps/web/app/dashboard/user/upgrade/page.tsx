"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";
import { BrandUpgradeForm, CreatorUpgradeForm, type UpgradeSnapshot } from "../_components/upgrade-forms";

export default function UserUpgradePage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<UpgradeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const redirectMessage = searchParams.get("message");

  useEffect(() => {
    fetch("/api/profile/role-upgrade", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error ?? "Không thể tải trạng thái nâng cấp");
        setData(payload.data as UpgradeSnapshot);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <PageHeader title="Đăng ký và nâng cấp vai trò" subtitle="Đăng ký trở thành Creator hoặc Brand để sử dụng dashboard chuyên biệt." />
      {redirectMessage ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {redirectMessage}
        </p>
      ) : null}
      {error ? <ErrorState title="Không thể tải dữ liệu" description={error} /> : null}
      {success ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {loading ? <div className="h-48 animate-pulse rounded-3xl bg-zinc-100" /> : null}
      {!loading && !data ? <EmptyState title="Không có dữ liệu" description="Vui lòng thử lại sau." /> : null}
      {data ? (
        <section className="grid gap-4 md:grid-cols-2">
          <CreatorUpgradeForm data={data} onError={setError} onSuccess={setSuccess} />
          <BrandUpgradeForm data={data} onError={setError} onSuccess={setSuccess} />
        </section>
      ) : null}
    </AppShell>
  );
}
