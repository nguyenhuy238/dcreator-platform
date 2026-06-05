"use client";

import { useEffect, useState } from "react";
import { ErrorState, LoadingSkeleton, SectionHeader } from "@/app/components/dcreator/ui/base";
import { BrandUpgradeForm, type UpgradeSnapshot } from "./upgrade-forms";

type ApiResult<T> = { success: boolean; data?: T; error?: string };

export function BrandUpgradeTabPanel() {
  const [data, setData] = useState<UpgradeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/profile/role-upgrade", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as ApiResult<UpgradeSnapshot>;
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? "Không thể tải trạng thái nâng cấp Brand.");
        }
        if (mounted) setData(payload.data);
      })
      .catch((requestError: Error) => {
        if (mounted) setLoadError(requestError.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (loadError) return <ErrorState title="Không thể tải nâng cấp Brand" description={loadError} />;
  if (!data) return null;

  return (
    <section className="dc-card p-5">
      <SectionHeader
        title="Nâng cấp Brand"
        subtitle="Tạo thương hiệu để thiết lập sản phẩm, campaign và làm việc với Creator."
      />
      {success ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {formError ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
      <div className="mt-4">
        <BrandUpgradeForm data={data} onError={setFormError} onSuccess={setSuccess} embedded />
      </div>
    </section>
  );
}
