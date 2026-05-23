"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type Campaign = {
  id: string;
  requestedSlug: string;
  title: string;
  brief: string;
  status: string;
  objective: string | null;
  priorityChannels: string | null;
  missionTypes: string | null;
  creatorCommissionPercent: number;
  userCommissionPercent: number;
  bonusBudgetVnd: number;
  feasibilityStatus: string;
  brandApprovalStatus: string;
  brandFeedback: string | null;
  adminNote: string | null;
  budgetVnd: number;
  targetAmountVnd: number;
  brand: { name: string; contactEmail: string };
  createdCampaign: { id: string; slug: string; title: string; status: string } | null;
};

export default function AdminCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Campaign[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard/campaign-reviews", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error ?? "Không tải được campaign");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được campaign");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(id: string, decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    let reason: string | undefined;
    if (decision !== "APPROVED") {
      reason = window.prompt("Nhập lý do:", decision === "REJECTED" ? "Không phù hợp policy" : "Cần chỉnh sửa giá, hoa hồng hoặc KPI")?.trim();
      if (!reason) return;
    }
    const res = await fetch(`/api/admin/dashboard/campaign-reviews/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reason ? { decision, reason } : { decision })
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Không xử lý được campaign");
      return;
    }
    await load();
  }

  return (
    <>
      <PageHeader title="Campaign CMS" subtitle="Nhận yêu cầu từ Brand; khi duyệt, Admin tạo campaign thật và publish lên hệ thống." />
      {error ? <ErrorState title="Không tải được campaign" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {!loading && !error ? (
        <section>
          <SectionHeader title="Yêu cầu campaign chờ Admin" subtitle={`Tổng ${items.length} yêu cầu`} />
          {items.length === 0 ? (
            <EmptyState title="Không có campaign chờ duyệt" description="Hiện tại chưa có Brand gửi yêu cầu campaign." />
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-zinc-600">/{item.requestedSlug} - #{item.id.slice(0, 8)}</p>
                      <p className="text-sm text-zinc-600">Brand: {item.brand.name} - {item.brand.contactEmail}</p>
                    </div>
                    <StatusBadge status={item.status.toLowerCase()} />
                  </div>
                  <p className="mt-3 text-sm text-zinc-600">{item.brief}</p>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600 md:grid-cols-3">
                    <p>Mục tiêu: <span className="font-semibold text-zinc-900">{item.objective || "N/A"}</span></p>
                    <p>Kênh: <span className="font-semibold text-zinc-900">{item.priorityChannels || "N/A"}</span></p>
                    <p>Nhiệm vụ: <span className="font-semibold text-zinc-900">{item.missionTypes || "N/A"}</span></p>
                    <p>Hoa hồng Creator: <span className="font-semibold text-zinc-900">{item.creatorCommissionPercent}%</span></p>
                    <p>Hoa hồng User: <span className="font-semibold text-zinc-900">{item.userCommissionPercent}%</span></p>
                    <p>Thưởng thêm: <span className="font-semibold text-zinc-900">{item.bonusBudgetVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Ngân sách: <span className="font-semibold text-zinc-900">{item.budgetVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Target: <span className="font-semibold text-zinc-900">{item.targetAmountVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Trạng thái request: <span className="font-semibold text-zinc-900">{item.status}</span></p>
                  </div>
                  {item.adminNote ? <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Admin note: {item.adminNote}</p> : null}
                  {item.brandFeedback ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Brand phản hồi: {item.brandFeedback}</p> : null}
                  {item.createdCampaign ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Đã tạo campaign: {item.createdCampaign.title} /{item.createdCampaign.slug}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="dc-btn-primary" onClick={() => void review(item.id, "APPROVED")}>Duyệt & publish</button>
                    <button className="dc-btn-secondary" onClick={() => void review(item.id, "REJECTED")}>Từ chối</button>
                    <button className="dc-btn-secondary" onClick={() => void review(item.id, "CHANGES_REQUESTED")}>Yêu cầu chỉnh sửa</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
