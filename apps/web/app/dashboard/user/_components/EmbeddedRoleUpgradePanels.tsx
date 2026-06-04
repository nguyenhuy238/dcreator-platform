"use client";

import { useEffect, useMemo, useState } from "react";
import { BrandUpgradeForm, CreatorUpgradeForm, type UpgradeSnapshot } from "./upgrade-forms";
import { SettingsAccordion } from "./SettingsAccordion";

type ApiResult<T> = { success: boolean; data?: T; error?: string };
type UpgradeTarget = "creator" | "brand";

type EmbeddedRoleUpgradePanelsProps = {
  targets: UpgradeTarget[];
  message?: string | null;
};

export function EmbeddedRoleUpgradePanels({ targets, message }: EmbeddedRoleUpgradePanelsProps) {
  const [data, setData] = useState<UpgradeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/profile/role-upgrade", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as ApiResult<UpgradeSnapshot>;
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? "Không thể tải trạng thái nâng cấp vai trò.");
        }
        setData(payload.data);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const visibleTargets = useMemo(() => {
    if (!data) return [] as UpgradeTarget[];
    const hasCreator = Boolean(data.account.hasCreatorProfile) || data.account.roles.includes("CREATOR");
    const hasBrand =
      (data.account.brandMemberships?.length ?? 0) > 0 ||
      data.account.roles.includes("BRAND_OWNER") ||
      data.account.roles.includes("BRAND_STAFF");

    return targets.filter((target) => {
      if (target === "creator") return !hasCreator;
      return !hasBrand;
    });
  }, [data, targets]);

  if (loading) return <div className="h-28 animate-pulse rounded-3xl bg-zinc-100" />;
  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!data || visibleTargets.length === 0) return null;

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {message}
        </p>
      ) : null}
      {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      {visibleTargets.includes("creator") ? (
        <SettingsAccordion
          title="Nâng cấp Creator"
          description="Tạo hồ sơ Creator để tham gia campaign, nhận nhiệm vụ và theo dõi hoa hồng."
        >
          <CreatorUpgradeForm data={data} onError={setError} onSuccess={setSuccess} embedded />
        </SettingsAccordion>
      ) : null}
      {visibleTargets.includes("brand") ? (
        <SettingsAccordion
          title="Nâng cấp Brand"
          description="Tạo thương hiệu để thiết lập sản phẩm, campaign và làm việc với Creator."
        >
          <BrandUpgradeForm data={data} onError={setError} onSuccess={setSuccess} embedded />
        </SettingsAccordion>
      ) : null}
    </div>
  );
}
