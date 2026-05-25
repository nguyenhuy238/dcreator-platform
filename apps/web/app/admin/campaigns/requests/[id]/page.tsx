"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionToast, ConfirmDialog, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };

type CampaignRequestDetail = {
  id: string;
  requestedSlug: string;
  title: string;
  brief: string;
  cleanBrief: string;
  coverImageUrl: string | null;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  setupSource: "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";
  objective: string | null;
  priorityChannels: string | null;
  missionTypes: string | null;
  creatorCommissionPercent: number;
  userCommissionPercent: number;
  bonusBudgetVnd: number;
  budgetVnd: number;
  targetAmountVnd: number;
  campaignType: "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
  category: "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
  adminNote: string | null;
  brandFeedback: string | null;
  createdCampaign: { id: string; slug: string; title: string; status: string } | null;
  brand: { id: string; name: string; contactEmail: string; ownerAccountId: string };
  reviewedBy: { id: string; displayName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminCampaignRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [item, setItem] = useState<CampaignRequestDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<null | "reject" | "request-changes">(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/dashboard/campaign-reviews/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CampaignRequestDetail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải chi tiết campaign request thất bại");
      setItem(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải chi tiết campaign request thất bại");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    if (!item) return;
    const needsReason = action !== "APPROVED";
    if (needsReason && !reason.trim()) {
      setError("Vui lòng nhập lý do.");
      return;
    }
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/dashboard/campaign-reviews/${item.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "APPROVED" ? { decision: action } : { decision: action, reason: reason.trim() })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
      setToast("Đã cập nhật quyết định campaign");
      setTimeout(() => setToast(""), 1800);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Chi tiết campaign request" subtitle="Đang tải dữ liệu..." />
        <LoadingSkeleton rows={6} />
      </>
    );
  }

  if (error || !item) {
    return <ErrorState title="Không tải được campaign request" description={error || "Lỗi không xác định"} onRetry={() => void load()} />;
  }

  const hasCoverImage = Boolean(item.coverImageUrl);

  return (
    <>
      <PageHeader
        title={item.title}
        subtitle={`Brand: ${item.brand.name}`}
        action={<button className="dc-btn-secondary" onClick={() => router.push("/admin/campaigns")}>Back</button>}
      />

      <SectionCard title="Tổng quan request">
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
              {hasCoverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.coverImageUrl ?? ""} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">Không có ảnh cover</div>
              )}
            </div>
            <StatusBadge status={item.status.toLowerCase()} />
          </div>

          <div className="grid gap-3">
            <div className="grid gap-1 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-900">/{item.requestedSlug}</p>
              <p>Brand: {item.brand.name} - {item.brand.contactEmail}</p>
              <p>Setup source: {item.setupSource}</p>
              <p>Campaign type: {item.campaignType}</p>
              <p>Category: {item.category}</p>
              <p>Trạng thái request: {item.status}</p>
              <p>Admin note: {item.adminNote || "Không có"}</p>
              <p>Brand feedback: {item.brandFeedback || "Không có"}</p>
              <p>Reviewed by: {item.reviewedBy ? `${item.reviewedBy.displayName} (${item.reviewedBy.email})` : "Chưa duyệt"}</p>
            </div>
            <div className="grid gap-2 text-sm text-zinc-600 md:grid-cols-3">
              <p>Hoa hồng Creator: <span className="font-semibold text-zinc-900">{item.creatorCommissionPercent}%</span></p>
              <p>Hoa hồng User: <span className="font-semibold text-zinc-900">{item.userCommissionPercent}%</span></p>
              <p>Thưởng thêm: <span className="font-semibold text-zinc-900">{item.bonusBudgetVnd.toLocaleString("vi-VN")}đ</span></p>
              <p>Ngân sách: <span className="font-semibold text-zinc-900">{item.budgetVnd.toLocaleString("vi-VN")}đ</span></p>
              <p>Target: <span className="font-semibold text-zinc-900">{item.targetAmountVnd.toLocaleString("vi-VN")}đ</span></p>
              <p>Đã tạo campaign: <span className="font-semibold text-zinc-900">{item.createdCampaign ? `${item.createdCampaign.title} /${item.createdCampaign.slug}` : "Chưa"}</span></p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Brief & mô tả" className="mt-4">
        <p className="whitespace-pre-wrap text-sm text-zinc-700">{item.cleanBrief || item.brief}</p>
      </SectionCard>

      <SectionCard title="Chi tiết chiến dịch" className="mt-4">
        <div className="grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
          <p>Mục tiêu: <span className="font-semibold text-zinc-900">{item.objective || "Không có"}</span></p>
          <p>Kênh ưu tiên: <span className="font-semibold text-zinc-900">{item.priorityChannels || "Không có"}</span></p>
          <p>Loại nhiệm vụ: <span className="font-semibold text-zinc-900">{item.missionTypes || "Không có"}</span></p>
          <p>Tạo lúc: <span className="font-semibold text-zinc-900">{new Date(item.createdAt).toLocaleString("vi-VN")}</span></p>
          <p>Cập nhật lúc: <span className="font-semibold text-zinc-900">{new Date(item.updatedAt).toLocaleString("vi-VN")}</span></p>
        </div>
      </SectionCard>

      {item.status === "PENDING_REVIEW" || item.status === "NEEDS_REVISION" ? (
        <SectionCard title="Quyết định" className="mt-4">
          <textarea className="dc-input min-h-24" placeholder="Lý do / ghi chú" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="dc-btn-primary" disabled={acting} onClick={() => void act("APPROVED")}>Duyệt & publish</button>
            <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("request-changes")}>Yêu cầu chỉnh sửa</button>
            <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("reject")}>Từ chối</button>
          </div>
        </SectionCard>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}

      <ConfirmDialog
        open={confirmAction === "reject"}
        title="Từ chối campaign request?"
        description="Brand sẽ nhận trạng thái từ chối cho campaign request này."
        confirmText="Từ chối"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void act("REJECTED");
        }}
      />
      <ConfirmDialog
        open={confirmAction === "request-changes"}
        title="Yêu cầu chỉnh sửa campaign request?"
        description="Brand sẽ nhận yêu cầu chỉnh sửa và có thể gửi lại."
        confirmText="Yêu cầu chỉnh sửa"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void act("CHANGES_REQUESTED");
        }}
      />
    </>
  );
}
