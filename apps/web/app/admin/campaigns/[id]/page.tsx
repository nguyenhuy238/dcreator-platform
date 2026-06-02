"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CampaignCoverImage } from "@/app/components/dcreator/ui/CampaignCoverImage";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader, SectionCard, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type CampaignCategory = "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
type CampaignType = "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
type CampaignSetupSource = "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";
type NoticeState = { tone: "success" | "error"; message: string } | null;
type CampaignDetail = {
  id: string;
  slug: string;
  title: string;
  brief: string;
  coverImageUrl: string | null;
  category: CampaignCategory;
  campaignType: CampaignType;
  setupSource: CampaignSetupSource;
  benefits: string | null;
  participationRoadmap: string[];
  objective: string | null;
  ugcVideoQuota: number | null;
  isPublic: boolean;
  status: string;
  statusView: string;
  startsAt: string | null;
  endsAt: string | null;
  budgetVnd: number;
  brand: { id: string; displayName: string; email: string };
  brandProfile: { id: string; name: string; status: string; commissionRatePercent: number | null; revenueSharePercent: number | null } | null;
  productSubmissions: Array<{
    id: string;
    name: string;
    reviewStatus: string;
    inventoryBatches: Array<{ id: string; quantityRemaining: number; stockStatus: string }>;
  }>;
  rewards: Array<{ id: string; title: string; pointsCost: number; stockTotal: number; stockRemaining: number }>;
  missions: Array<{ id: string; title: string; audience: string }>;
  kpiSnapshot: { targetAmountVnd: number; fundedAmountVnd: number; backerCount: number; contributionCount: number };
  commission: { commissionRatePercent: number | null; revenueSharePercent: number | null };
  quota: { creator: number; user: number };
};

function getStatusLabel(value: string) {
  const map: Record<string, string> = {
    DRAFT: "Bản nháp",
    ACTIVE: "Đang hoạt động",
    PAUSED: "Tạm dừng",
    COMPLETED: "Đã hoàn thành",
    ARCHIVED: "Đã lưu trữ",
    APPROVED: "Đã duyệt",
    REJECTED: "Đã từ chối",
    PENDING_REVIEW: "Chờ duyệt",
    NEEDS_REVISION: "Cần chỉnh sửa"
  };
  return map[value] ?? value;
}

function getAudienceLabel(value: string) {
  if (value === "CREATOR") return "Nhà sáng tạo";
  if (value === "USER") return "Người dùng";
  return value;
}

export default function AdminCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);
  const [item, setItem] = useState<CampaignDetail | null>(null);
  const [acting, setActing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "pause" | "reject" | "request-changes">(null);
  const [editing, setEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editForm, setEditForm] = useState({
    slug: "",
    title: "",
    brief: "",
    imageUrl: "",
    category: "LIFESTYLE" as CampaignCategory,
    campaignType: "COMMUNITY" as CampaignType,
    setupSource: "BRAND_REQUESTED" as CampaignSetupSource,
    benefits: "",
    objective: "",
    participationRoadmap: [""],
    ugcVideoQuota: 1,
    isPublic: true,
    startsAt: "",
    endsAt: "",
    budgetVnd: 0,
    targetAmountVnd: 0
  });

  function showNotice(tone: "success" | "error", message: string) {
    setNotice({ tone, message });
    window.setTimeout(() => {
      setNotice((current) => (current?.message === message ? null : current));
    }, 2200);
  }

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setPageError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<CampaignDetail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải chi tiết chiến dịch thất bại");
      setItem(body.data);
      setEditForm({
        slug: body.data.slug,
        title: body.data.title,
        brief: body.data.brief,
        imageUrl: body.data.coverImageUrl ?? "",
        category: body.data.category,
        campaignType: body.data.campaignType,
        setupSource: body.data.setupSource,
        benefits: body.data.benefits ?? "",
        objective: body.data.objective ?? "",
        participationRoadmap: body.data.participationRoadmap.length > 0 ? body.data.participationRoadmap : [""],
        ugcVideoQuota: body.data.ugcVideoQuota ?? 1,
        isPublic: body.data.isPublic,
        startsAt: body.data.startsAt ? new Date(body.data.startsAt).toISOString().slice(0, 16) : "",
        endsAt: body.data.endsAt ? new Date(body.data.endsAt).toISOString().slice(0, 16) : "",
        budgetVnd: body.data.budgetVnd,
        targetAmountVnd: body.data.kpiSnapshot.targetAmountVnd
      });
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "Tải chi tiết chiến dịch thất bại");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(action: "approve" | "reject" | "request-changes" | "pause", reason?: string) {
    if (!item) return;
    if (action !== "approve" && !reason?.trim()) {
      showNotice("error", "Vui lòng nhập lý do trước khi thực hiện thao tác.");
      return;
    }
    setActing(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${item.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "approve" ? JSON.stringify({}) : JSON.stringify({ reason: reason?.trim() })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
      showNotice("success", "Đã cập nhật trạng thái campaign.");
      await load();
    } catch (e) {
      showNotice("error", e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setActing(false);
    }
  }

  async function uploadCoverImage(file: File) {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.set("logo", file);
      const response = await fetch("/api/uploads/brand-logo", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResult<{ logoUrl: string }>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Upload ảnh thất bại" : payload.error);
      setEditForm((current) => ({ ...current, imageUrl: payload.data.logoUrl }));
      showNotice("success", "Đã tải ảnh campaign.");
    } catch (uploadError) {
      showNotice("error", uploadError instanceof Error ? uploadError.message : "Upload ảnh thất bại");
    } finally {
      setUploadingImage(false);
    }
  }

  function setRoadmapStep(index: number, value: string) {
    setEditForm((current) => ({
      ...current,
      participationRoadmap: current.participationRoadmap.map((step, stepIndex) => (stepIndex === index ? value : step))
    }));
  }

  function addRoadmapStep() {
    setEditForm((current) => ({
      ...current,
      participationRoadmap: [...current.participationRoadmap, ""]
    }));
  }

  function removeRoadmapStep(index: number) {
    setEditForm((current) => ({
      ...current,
      participationRoadmap: current.participationRoadmap.length === 1
        ? current.participationRoadmap
        : current.participationRoadmap.filter((_, stepIndex) => stepIndex !== index)
    }));
  }

  async function saveEdit() {
    if (!item) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: editForm.slug,
          title: editForm.title,
          brief: editForm.brief,
          imageUrl: editForm.imageUrl,
          category: editForm.category,
          campaignType: editForm.campaignType,
          setupSource: editForm.setupSource,
          benefits: editForm.benefits,
          objective: editForm.objective,
          participationRoadmap: editForm.participationRoadmap.filter((itemValue) => itemValue.trim().length > 0),
          ugcVideoQuota: Number(editForm.ugcVideoQuota),
          isPublic: editForm.isPublic,
          startsAt: editForm.startsAt ? new Date(editForm.startsAt).toISOString() : null,
          endsAt: editForm.endsAt ? new Date(editForm.endsAt).toISOString() : null,
          budgetVnd: Number(editForm.budgetVnd),
          targetAmountVnd: Number(editForm.targetAmountVnd),
          reason: "Cập nhật thông tin campaign từ admin"
        })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Cập nhật campaign thất bại");
      showNotice("success", "Đã cập nhật campaign.");
      setEditing(false);
      await load();
    } catch (e) {
      showNotice("error", e instanceof Error ? e.message : "Cập nhật campaign thất bại");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Chi tiết chiến dịch" subtitle="Đang tải dữ liệu..." />
        <LoadingSkeleton rows={6} />
      </>
    );
  }

  if (pageError || !item) {
    return <ErrorState title="Không tải được campaign detail" description={pageError || "Lỗi không xác định"} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHeader
        title={item.title}
        subtitle={`Brand: ${item.brand.displayName}`}
        action={
          <div className="flex gap-2">
            <button className="dc-btn-secondary" onClick={() => router.push(`/admin/campaigns/${item.id}/applications`)}>Đơn đăng ký</button>
            <button className="dc-btn-secondary" onClick={() => router.push("/admin/campaigns")}>Quay lại</button>
          </div>
        }
      />
      <SectionCard title="Campaign status">
        <div className="flex items-center justify-between">
          <StatusBadge status={item.statusView.toLowerCase()} />
        </div>
        <div className="mt-3 grid gap-2 text-sm text-zinc-700">
          <p>Slug: /campaigns/{item.slug}</p>
          <p>Brief: {item.brief}</p>
          <p>Category / Type: {item.category} / {item.campaignType}</p>
          <p>Setup source: {item.setupSource}</p>
          <p>Mục tiêu: {item.objective ?? "Không có"}</p>
          <p>Quyền lợi: {item.benefits ?? "Không có"}</p>
          <p>UGC video quota: {item.ugcVideoQuota ?? "Không có"} • Public: {item.isPublic ? "Có" : "Không"}</p>
          <p>Timeline: {item.startsAt ? new Date(item.startsAt).toLocaleString("vi-VN") : "Không có"} - {item.endsAt ? new Date(item.endsAt).toLocaleString("vi-VN") : "Không có"}</p>
          <p>Budget: {item.budgetVnd.toLocaleString("vi-VN")} VND</p>
          <p>KPI: Target {item.kpiSnapshot.targetAmountVnd.toLocaleString("vi-VN")} / Funded {item.kpiSnapshot.fundedAmountVnd.toLocaleString("vi-VN")} / Backers {item.kpiSnapshot.backerCount}</p>
          <p>Commission: {item.commission.commissionRatePercent ?? "Không có"}% • Revenue share: {item.commission.revenueSharePercent ?? "Không có"}%</p>
          <p>Quota Creator/User: {item.quota.creator} / {item.quota.user}</p>
          <p>Brand approved: {item.brandProfile?.status === "ACTIVE" ? "Có" : "Không"}</p>
        </div>
      </SectionCard>

      <section className="mt-4 dc-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Thông tin campaign</p>
          {!editing ? (
            <button className="dc-btn-secondary" onClick={() => setEditing(true)}>Chỉnh sửa</button>
          ) : (
            <div className="flex gap-2">
              <button className="dc-btn-secondary" onClick={() => setEditing(false)} disabled={acting}>Hủy</button>
              <button className="dc-btn-primary" onClick={() => void saveEdit()} disabled={acting}>Lưu</button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Slug</span>
              <input className="dc-input" value={editForm.slug} onChange={(e) => setEditForm((s) => ({ ...s, slug: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Tên campaign</span>
              <input className="dc-input" value={editForm.title} onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))} />
            </label>
            <div className="grid gap-2 text-sm md:col-span-2">
              <span className="font-semibold">Ảnh campaign</span>
              <input className="dc-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCoverImage(file); }} />
              <input className="dc-input" value={editForm.imageUrl} onChange={(e) => setEditForm((s) => ({ ...s, imageUrl: e.target.value }))} placeholder="/uploads/... hoặc https://..." />
              {uploadingImage ? <p className="text-xs text-zinc-500">Đang tải ảnh...</p> : null}
              <div className="relative h-40 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                <CampaignCoverImage src={editForm.imageUrl} alt={editForm.title || "Campaign cover"} className="object-cover" sizes="100vw" />
              </div>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Ngành hàng</span>
              <select className="dc-input" value={editForm.category} onChange={(e) => setEditForm((s) => ({ ...s, category: e.target.value as CampaignCategory }))}>
                <option value="LIFESTYLE">Lối sống</option>
                <option value="FOOD">Ẩm thực</option>
                <option value="BEAUTY">Làm đẹp</option>
                <option value="FASHION">Thời trang</option>
                <option value="TECH">Công nghệ</option>
                <option value="EDUCATION">Giáo dục</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Loại campaign</span>
              <select className="dc-input" value={editForm.campaignType} onChange={(e) => setEditForm((s) => ({ ...s, campaignType: e.target.value as CampaignType }))}>
                <option value="COMMUNITY">COMMUNITY</option>
                <option value="DONATION">DONATION</option>
                <option value="PREORDER">PREORDER</option>
                <option value="SPONSORSHIP">SPONSORSHIP</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Nguồn thiết lập</span>
              <select className="dc-input" value={editForm.setupSource} onChange={(e) => setEditForm((s) => ({ ...s, setupSource: e.target.value as CampaignSetupSource }))}>
                <option value="BRAND_REQUESTED">Brand yêu cầu</option>
                <option value="JOIN_EXISTING_DCREATOR_CAMP">Tham gia chiến dịch dCreator có sẵn</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Budget (VND)</span>
              <input className="dc-input" type="number" min={1} value={editForm.budgetVnd} onChange={(e) => setEditForm((s) => ({ ...s, budgetVnd: Number(e.target.value || 0) }))} />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Brief</span>
              <textarea className="dc-input min-h-24" value={editForm.brief} onChange={(e) => setEditForm((s) => ({ ...s, brief: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Mục tiêu campaign</span>
              <textarea className="dc-input min-h-24" value={editForm.objective} onChange={(e) => setEditForm((s) => ({ ...s, objective: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="font-semibold">Quyền lợi</span>
              <textarea className="dc-input min-h-24" value={editForm.benefits} onChange={(e) => setEditForm((s) => ({ ...s, benefits: e.target.value }))} />
            </label>
            <div className="grid gap-2 text-sm md:col-span-2">
              <span className="font-semibold">Lộ trình tham gia</span>
              {editForm.participationRoadmap.map((step, index) => (
                <div key={`roadmap-${index}`} className="flex gap-2">
                  <input className="dc-input" value={step} onChange={(e) => setRoadmapStep(index, e.target.value)} placeholder={`Bước ${index + 1}`} />
                  {editForm.participationRoadmap.length > 1 ? (
                    <button type="button" className="dc-btn-secondary" onClick={() => removeRoadmapStep(index)}>Xóa</button>
                  ) : null}
                </div>
              ))}
              <button type="button" className="dc-btn-secondary w-fit" onClick={addRoadmapStep}>+ Thêm bước</button>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Starts at</span>
              <input className="dc-input" type="datetime-local" value={editForm.startsAt} onChange={(e) => setEditForm((s) => ({ ...s, startsAt: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Ends at</span>
              <input className="dc-input" type="datetime-local" value={editForm.endsAt} onChange={(e) => setEditForm((s) => ({ ...s, endsAt: e.target.value }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Target amount (VND)</span>
              <input className="dc-input" type="number" min={1} value={editForm.targetAmountVnd} onChange={(e) => setEditForm((s) => ({ ...s, targetAmountVnd: Number(e.target.value || 0) }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">UGC video quota</span>
              <input className="dc-input" type="number" min={1} value={editForm.ugcVideoQuota} onChange={(e) => setEditForm((s) => ({ ...s, ugcVideoQuota: Number(e.target.value || 0) }))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Hiển thị public</span>
              <select className="dc-input" value={editForm.isPublic ? "true" : "false"} onChange={(e) => setEditForm((s) => ({ ...s, isPublic: e.target.value === "true" }))}>
                <option value="true">Có</option>
                <option value="false">Không</option>
              </select>
            </label>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Dùng nút Chỉnh sửa để cập nhật slug, ảnh, phân loại, mục tiêu, lộ trình, quota, timeline, budget và target.</p>
        )}
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Sản phẩm / tồn kho</p>
        <div className="mt-3 grid gap-2">
          {item.productSubmissions.length === 0 ? (
            <p className="text-sm text-zinc-600">Chưa có sản phẩm/lô hàng gắn vào campaign.</p>
          ) : (
            item.productSubmissions.map((product) => (
              <div key={product.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <p className="font-semibold">{product.name}</p>
                <p>Trạng thái: {getStatusLabel(product.reviewStatus)}</p>
                <p>Stock remaining: {product.inventoryBatches.reduce((sum, b) => sum + b.quantityRemaining, 0).toLocaleString("vi-VN")}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Phần thưởng & nhiệm vụ</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">Rewards</p>
            {item.rewards.length === 0 ? <p className="text-sm text-zinc-600">No rewards</p> : item.rewards.map((reward) => (
              <div key={reward.id} className="mb-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <p className="font-semibold">{reward.title}</p>
                <p>Points: {reward.pointsCost}</p>
                <p>Stock: {reward.stockRemaining}/{reward.stockTotal}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Nhiệm vụ</p>
            {item.missions.length === 0 ? <p className="text-sm text-zinc-600">Chưa có nhiệm vụ</p> : item.missions.map((mission) => (
              <div key={mission.id} className="mb-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <p className="font-semibold">{mission.title}</p>
                <p>Đối tượng: {getAudienceLabel(mission.audience)}</p>
                <p>Nhiệm vụ đã gắn cho {getAudienceLabel(mission.audience).toLowerCase()}.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4">
        <SectionCard title="Quyết định">
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="dc-btn-primary" disabled={acting} onClick={() => void act("approve")}>Approve & Publish</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("request-changes")}>Request changes</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("pause")}>Pause</button>
          <button className="dc-btn-secondary" disabled={acting} onClick={() => setConfirmAction("reject")}>Reject</button>
        </div>
        </SectionCard>
      </section>

      {notice ? <ActionToast message={notice.message} tone={notice.tone} /> : null}
      <ReviewActionDialog
        open={confirmAction === "pause"}
        title="Pause campaign?"
        description="Campaign sẽ tạm dừng hiển thị và vận hành."
        confirmLabel="Pause campaign"
        requireReason
        reasonPlaceholder="Nêu rõ lý do tạm dừng campaign..."
        submitting={acting}
        onCancel={() => !acting && setConfirmAction(null)}
        onConfirm={(reason) => {
          setConfirmAction(null);
          void act("pause", reason);
        }}
      />
      <ReviewActionDialog
        open={confirmAction === "reject"}
        title="Reject campaign?"
        description="Campaign sẽ bị từ chối và cần tạo/chỉnh lại theo policy."
        confirmLabel="Reject campaign"
        requireReason
        reasonPlaceholder="Nêu rõ lý do từ chối campaign..."
        submitting={acting}
        onCancel={() => !acting && setConfirmAction(null)}
        onConfirm={(reason) => {
          setConfirmAction(null);
          void act("reject", reason);
        }}
      />
      <ReviewActionDialog
        open={confirmAction === "request-changes"}
        title="Request campaign changes?"
        description="Campaign sẽ được trả về trạng thái cần chỉnh sửa."
        confirmLabel="Yêu cầu chỉnh sửa"
        requireReason
        reasonPlaceholder="Nêu rõ nội dung cần Brand chỉnh sửa..."
        submitting={acting}
        onCancel={() => !acting && setConfirmAction(null)}
        onConfirm={(reason) => {
          setConfirmAction(null);
          void act("request-changes", reason);
        }}
      />
    </>
  );
}
