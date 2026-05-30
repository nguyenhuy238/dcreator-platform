"use client";

import { useCallback, useEffect, useState } from "react";
import { ManagementActionMenu } from "@/app/admin/_components/ManagementActionMenu";
import { RiskFlagBadge } from "@/app/admin/_components/RiskFlagBadge";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type RiskItem = { key: string; label: string; count: number; severity: "low" | "medium" | "high" };

export default function AdminRiskPage() {
  const [items, setItems] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard/fraud-risk", { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Record<string, unknown>>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Không tải được risk data");
      const data = body.data;
      const mapped: RiskItem[] = [
        { key: "duplicate_proof", label: "Creator có proof trùng", count: Number((data as any).duplicateProofs ?? 0), severity: "high" },
        { key: "invalid_link", label: "Proof link lỗi", count: Number((data as any).invalidProofLinks ?? 0), severity: "medium" },
        { key: "expired_campaign", label: "Campaign quá hạn", count: Number((data as any).expiredCampaigns ?? 0), severity: "medium" },
        { key: "insufficient_brand_fund", label: "Brand thiếu prepaid fund", count: Number((data as any).insufficientPrepaidFundBrands ?? 0), severity: "high" },
        { key: "payment_failed", label: "Payment failed", count: Number((data as any).failedPayments ?? 0), severity: "high" },
        { key: "abnormal_stock", label: "Reward stock bất thường", count: Number((data as any).abnormalRewardStocks ?? 0), severity: "medium" },
        { key: "abnormal_user", label: "User/Creator bất thường", count: Number((data as any).abnormalActors ?? 0), severity: "high" }
      ];
      setItems(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được risk data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <PageHeader title="Risk & Fraud" subtitle="Theo dõi tín hiệu gian lận và can thiệp vận hành." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {error ? <ErrorState title="Không tải được Risk" description={error} onRetry={() => void load()} /> : null}
      {!loading && !error ? (
        items.length === 0 ? <EmptyState title="Không có dữ liệu Risk" description="Chưa có tín hiệu rủi ro." /> : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.key} className="dc-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">{item.label}</p>
                  <p className="text-sm text-zinc-600">Số case: {item.count}</p>
                </div>
                <div className="flex items-center gap-2">
                  <RiskFlagBadge flagged={item.count > 0} />
                  <ManagementActionMenu
                    items={[
                      { key: "resolved", label: "Mark resolved" },
                      { key: "escalate", label: "Escalate" },
                      { key: "suspend", label: "Suspend related account", danger: true },
                      { key: "note", label: "Add internal note" },
                      { key: "view", label: "View related entity" }
                    ]}
                    onSelect={(key) => {
                      if (key === "view") window.location.href = "/admin/audit";
                      else if (key === "suspend") window.location.href = "/admin/creators";
                      else {
                        void (async () => {
                          try {
                            const reason = window.prompt("Nhập lý do:");
                            if (!reason) return;
                            const action = key === "resolved" ? "RESOLVED" : "ESCALATED";
                            const riskRes = await fetch("/api/admin/risk?status=OPEN");
                            const riskBody = await riskRes.json();
                            if (!riskRes.ok || !riskBody.success || !riskBody.data?.length) throw new Error("Không có risk flag mở");
                            const firstId = riskBody.data[0].id as string;
                            const res = await fetch(`/api/admin/risk/${firstId}/resolve`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action, reason, note: item.label })
                            });
                            const body = await res.json();
                            if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
                            setToast(action === "RESOLVED" ? "Đã mark resolved" : "Đã escalate");
                            setTimeout(() => setToast(""), 1800);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Thao tác thất bại");
                          }
                        })();
                      }
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
