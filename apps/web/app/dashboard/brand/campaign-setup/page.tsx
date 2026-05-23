"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

const nav = [
  { href: "/dashboard/brand", label: "Brand Dashboard" },
  { href: "/dashboard/brand/onboarding", label: "Onboarding / BCC" },
  { href: "/dashboard/brand/products", label: "Sản phẩm & lô hàng" },
  { href: "/dashboard/brand/campaign-setup", label: "Yêu cầu campaign" },
  { href: "/dashboard/brand/profile", label: "Brand Profile" },
  { href: "/brand", label: "Chiến dịch" },
  { href: "/brand/proofs", label: "Duyệt proof" },
  { href: "/wallet", label: "Quỹ" }
];

type CampaignRequest = {
  id: string;
  requestedSlug: string;
  title: string;
  brief: string;
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
};

type RequestForm = {
  requestedSlug: string;
  title: string;
  brief: string;
  objective: string;
  priorityChannels: string;
  missionTypes: string;
  creatorCommissionPercent: number;
  userCommissionPercent: number;
  bonusBudgetVnd: number;
  budgetVnd: number;
  targetAmountVnd: number;
  campaignType: CampaignRequest["campaignType"];
  category: CampaignRequest["category"];
  startsAt: string;
  endsAt: string;
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

const defaultForm: RequestForm = {
  requestedSlug: "",
  title: "",
  brief: "",
  objective: "",
  priorityChannels: "",
  missionTypes: "",
  creatorCommissionPercent: 0,
  userCommissionPercent: 0,
  bonusBudgetVnd: 0,
  budgetVnd: 10000000,
  targetAmountVnd: 10000000,
  campaignType: "COMMUNITY",
  category: "LIFESTYLE",
  startsAt: "",
  endsAt: ""
};

function toDateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function requestStatusLabel(status: CampaignRequest["status"]) {
  if (status === "APPROVED") return "Admin đã tạo & publish campaign";
  if (status === "REJECTED") return "Admin từ chối";
  if (status === "NEEDS_REVISION") return "Admin yêu cầu chỉnh sửa";
  return "Chờ Admin duyệt";
}

export default function CampaignSetupPage() {
  const [requests, setRequests] = useState<CampaignRequest[]>([]);
  const [form, setForm] = useState<RequestForm>(defaultForm);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/campaign-requests", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<CampaignRequest[]>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể tải yêu cầu campaign" : payload.error);
      setRequests(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải yêu cầu campaign");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  function setField<K extends keyof RequestForm>(name: K, value: RequestForm[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function createRequest(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/brand/dashboard/campaign-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          setupSource: "BRAND_REQUESTED",
          startsAt: toDateTime(form.startsAt),
          endsAt: toDateTime(form.endsAt)
        })
      });
      const payload = (await response.json()) as ApiResponse<CampaignRequest>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể gửi yêu cầu campaign" : payload.error);
      setForm(defaultForm);
      setSuccess("Đã gửi yêu cầu campaign cho Admin.");
      await loadRequests();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi yêu cầu campaign");
    } finally {
      setSaving(false);
    }
  }

  async function sendFeedback(requestId: string) {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/brand/dashboard/campaign-requests/${requestId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback[requestId] ?? "" })
      });
      const payload = (await response.json()) as ApiResponse<CampaignRequest>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể gửi phản hồi" : payload.error);
      setSuccess("Đã gửi phản hồi lại cho Admin.");
      await loadRequests();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi phản hồi");
    }
  }

  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader
          title="Yêu cầu campaign"
          subtitle="Brand gửi yêu cầu, Admin duyệt rồi tạo campaign thật và publish lên hệ thống Creator/User."
        />
        {error ? <ErrorState title="Không thể xử lý yêu cầu campaign" description={error} onRetry={() => void loadRequests()} /> : null}
        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <form className="dc-card mt-6 grid gap-5 p-5" onSubmit={createRequest}>
          <SectionHeader title="Tạo yêu cầu campaign" />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Slug đề xuất
              <input className="dc-input" value={form.requestedSlug} onChange={(event) => setField("requestedSlug", event.target.value)} placeholder="freshskin-genz-launch" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
              Tên campaign mong muốn
              <input className="dc-input" value={form.title} onChange={(event) => setField("title", event.target.value)} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
              Brief yêu cầu
              <textarea className="dc-input min-h-24" value={form.brief} onChange={(event) => setField("brief", event.target.value)} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
              Mục tiêu
              <textarea className="dc-input min-h-20" value={form.objective} onChange={(event) => setField("objective", event.target.value)} placeholder="Ra mắt sản phẩm mới, test thị trường Gen Z..." />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Kênh ưu tiên
              <input className="dc-input" value={form.priorityChannels} onChange={(event) => setField("priorityChannels", event.target.value)} placeholder="TikTok, Shopee, Instagram..." />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Loại nhiệm vụ
              <input className="dc-input" value={form.missionTypes} onChange={(event) => setField("missionTypes", event.target.value)} placeholder="Video review, livestream, post, user mission..." />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Hoa hồng Creator (%)
              <input className="dc-input" type="number" min={0} max={100} value={form.creatorCommissionPercent} onChange={(event) => setField("creatorCommissionPercent", Number(event.target.value))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Hoa hồng User (%)
              <input className="dc-input" type="number" min={0} max={100} value={form.userCommissionPercent} onChange={(event) => setField("userCommissionPercent", Number(event.target.value))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Ngân sách dự kiến
              <input className="dc-input" type="number" min={1} value={form.budgetVnd} onChange={(event) => setField("budgetVnd", Number(event.target.value))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Ngân sách thưởng thêm
              <input className="dc-input" type="number" min={0} value={form.bonusBudgetVnd} onChange={(event) => setField("bonusBudgetVnd", Number(event.target.value))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Target amount
              <input className="dc-input" type="number" min={1} value={form.targetAmountVnd} onChange={(event) => setField("targetAmountVnd", Number(event.target.value))} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Loại campaign
              <select className="dc-input" value={form.campaignType} onChange={(event) => setField("campaignType", event.target.value as RequestForm["campaignType"])}>
                <option value="COMMUNITY">Community</option>
                <option value="SPONSORSHIP">Sponsorship</option>
                <option value="PREORDER">Preorder</option>
                <option value="DONATION">Ủng hộ</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Ngành hàng
              <select className="dc-input" value={form.category} onChange={(event) => setField("category", event.target.value as RequestForm["category"])}>
                <option value="LIFESTYLE">Lifestyle</option>
                <option value="FOOD">Food</option>
                <option value="BEAUTY">Beauty</option>
                <option value="FASHION">Fashion</option>
                <option value="TECH">Tech</option>
                <option value="EDUCATION">Education</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Ngày bắt đầu mong muốn
              <input className="dc-input" type="datetime-local" value={form.startsAt} onChange={(event) => setField("startsAt", event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              Ngày kết thúc mong muốn
              <input className="dc-input" type="datetime-local" value={form.endsAt} onChange={(event) => setField("endsAt", event.target.value)} />
            </label>
          </div>
          <button className="dc-btn-primary w-fit" type="submit" disabled={saving}>
            {saving ? "Đang gửi..." : "Gửi yêu cầu cho Admin"}
          </button>
        </form>

        <section className="mt-8">
          <SectionHeader title="Danh sách yêu cầu campaign" />
          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : requests.length === 0 ? (
            <EmptyState title="Chưa có yêu cầu campaign" description="Tạo yêu cầu để Admin tạo campaign và publish." />
          ) : (
            <div className="grid gap-4">
              {requests.map((request) => (
                <article key={request.id} className="dc-card grid gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">/{request.requestedSlug}</p>
                      <h2 className="text-xl font-black text-zinc-900">{request.title}</h2>
                      <p className="mt-1 text-sm text-zinc-600">{request.brief}</p>
                    </div>
                    <p className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-700">{requestStatusLabel(request.status)}</p>
                  </div>
                  <div className="grid gap-2 text-sm text-zinc-600 md:grid-cols-3">
                    <p>Mục tiêu: <span className="font-semibold text-zinc-900">{request.objective || "Chưa khai báo"}</span></p>
                    <p>Kênh: <span className="font-semibold text-zinc-900">{request.priorityChannels || "Chưa khai báo"}</span></p>
                    <p>Nhiệm vụ: <span className="font-semibold text-zinc-900">{request.missionTypes || "Chưa khai báo"}</span></p>
                    <p>Hoa hồng Creator: <span className="font-semibold text-zinc-900">{request.creatorCommissionPercent}%</span></p>
                    <p>Hoa hồng User: <span className="font-semibold text-zinc-900">{request.userCommissionPercent}%</span></p>
                    <p>Thưởng thêm: <span className="font-semibold text-zinc-900">{request.bonusBudgetVnd.toLocaleString("vi-VN")}đ</span></p>
                  </div>
                  {request.adminNote ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Admin phản hồi: {request.adminNote}</p> : null}
                  {request.brandFeedback ? <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Brand phản hồi: {request.brandFeedback}</p> : null}
                  {request.createdCampaign ? (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      Campaign đã publish: {request.createdCampaign.title} /{request.createdCampaign.slug}
                    </p>
                  ) : null}
                  {request.status === "NEEDS_REVISION" ? (
                    <div className="grid gap-2">
                      <textarea
                        className="dc-input min-h-20"
                        value={feedback[request.id] ?? ""}
                        onChange={(event) => setFeedback((current) => ({ ...current, [request.id]: event.target.value }))}
                        placeholder="Brand phản hồi Admin điều chỉnh giá, hoa hồng, KPI..."
                      />
                      <button className="dc-btn-outline w-fit" type="button" onClick={() => void sendFeedback(request.id)}>
                        Gửi lại cho Admin
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </AppShell>
    </>
  );
}
