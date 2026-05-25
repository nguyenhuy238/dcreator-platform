"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";
import { getCampaignTypeLabel } from "@/lib/constants/campaign-type";
import { campaignRequestSchema } from "@/lib/validators/brand-dashboard";

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
  createdAt: string;
  updatedAt: string;
};

type RequestForm = {
  requestedSlug: string;
  title: string;
  brief: string;
  coverImageUrl: string;
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
type FieldErrors = Partial<Record<keyof RequestForm | "coverImageUrl", string>>;

const defaultForm: RequestForm = {
  requestedSlug: "",
  title: "",
  brief: "",
  coverImageUrl: "",
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

const COVER_MARKER = "[[COVER_IMAGE_URL]]:";

function stripCoverImageMeta(brief: string) {
  return brief
    .split("\n")
    .filter((line) => !line.trim().startsWith(COVER_MARKER))
    .join("\n")
    .trim();
}

function attachCoverImageMeta(brief: string, coverImageUrl: string) {
  const cleanBrief = stripCoverImageMeta(brief);
  const url = coverImageUrl.trim();
  if (!url) return cleanBrief;
  return `${cleanBrief}\n${COVER_MARKER}${url}`.trim();
}

function requestStatusLabel(status: CampaignRequest["status"]) {
  if (status === "APPROVED") return "Admin đã tạo & publish campaign";
  if (status === "REJECTED") return "Admin từ chối";
  if (status === "NEEDS_REVISION") return "Admin yêu cầu chỉnh sửa";
  return "Chờ Admin duyệt";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

function parseNonNegativeInt(raw: string) {
  const digits = onlyDigits(raw);
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

function parsePercent(raw: string) {
  return Math.min(100, parseNonNegativeInt(raw));
}

function formatIntForInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toLocaleString("vi-VN");
}

function SectionField({
  label,
  children,
  hint,
  error
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-zinc-700">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-medium text-zinc-500">{hint}</span> : null}
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

export default function CampaignSetupPage() {
  const [requests, setRequests] = useState<CampaignRequest[]>([]);
  const [form, setForm] = useState<RequestForm>(defaultForm);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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
    setFieldErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function isValidCoverImageUrl(value: string) {
    const url = value.trim();
    if (!url) return true;
    if (url.startsWith("/uploads/") && !url.includes("..")) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};
    const payload = {
      ...form,
      brief: attachCoverImageMeta(form.brief, form.coverImageUrl),
      setupSource: "BRAND_REQUESTED" as const,
      startsAt: toDateTime(form.startsAt),
      endsAt: toDateTime(form.endsAt)
    };
    const parsed = campaignRequestSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && key in form && !nextErrors[key as keyof RequestForm]) {
          nextErrors[key as keyof RequestForm] = issue.message;
        }
      }
    }
    if (!isValidCoverImageUrl(form.coverImageUrl)) {
      nextErrors.coverImageUrl = "URL ảnh cover không hợp lệ. Dùng https://... hoặc /uploads/...";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function createRequest(event: FormEvent) {
    event.preventDefault();
    if (!validateForm()) {
      setError("Vui lòng sửa các trường được đánh dấu.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/brand/dashboard/campaign-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          brief: attachCoverImageMeta(form.brief, form.coverImageUrl),
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

  async function uploadCoverImage(file: File) {
    setUploadingCover(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch("/api/uploads/brand-logo", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<{ logoUrl: string }>;
      if (!response.ok || !payload.success || !payload.data?.logoUrl) {
        throw new Error(payload.success ? "Không thể tải ảnh campaign" : payload.error);
      }
      setField("coverImageUrl", payload.data.logoUrl);
      setFieldErrors((current) => {
        if (!current.coverImageUrl) return current;
        const next = { ...current };
        delete next.coverImageUrl;
        return next;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ảnh campaign");
    } finally {
      setUploadingCover(false);
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
      
      <>
        <PageHeader
          title="Yêu cầu campaign"
          subtitle="Brand gửi yêu cầu, Admin duyệt rồi tạo campaign thật và publish lên hệ thống Creator/User."
        />
        {error ? <ErrorState title="Không thể xử lý yêu cầu campaign" description={error} onRetry={() => void loadRequests()} /> : null}
        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        <form className="dc-card mt-6 grid gap-6 p-5" onSubmit={createRequest}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeader title="Tạo yêu cầu campaign" />
            <p className="max-w-2xl text-sm text-zinc-500">
              Điền đầy đủ thông tin để Admin có thể duyệt nhanh: tên campaign, nội dung, mục tiêu, kênh, ngân sách và tỉ lệ chia.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-500">Thông tin cơ bản</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SectionField label="Slug campaign" hint="Dùng cho URL nội bộ, không có dấu cách." error={fieldErrors.requestedSlug}>
                  <input className="dc-input" value={form.requestedSlug} onChange={(event) => setField("requestedSlug", event.target.value)} placeholder="vd: tet-sale-2026" />
                </SectionField>
                <SectionField label="Tên campaign" hint="Tên hiển thị công khai cho Creator/User." error={fieldErrors.title}>
                  <input className="dc-input" value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="vd: Tết 2026 cùng Brand A" />
                </SectionField>
                <SectionField label="Ảnh cover campaign" hint="Tải ảnh lên để hiển thị ở danh sách campaign/public." error={fieldErrors.coverImageUrl}>
                  <div className="grid gap-2">
                    <input className="dc-input bg-white" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (file) void uploadCoverImage(file);
                      event.currentTarget.value = "";
                    }} disabled={uploadingCover} />
                    <input className="dc-input" type="text" value={form.coverImageUrl} onChange={(event) => setField("coverImageUrl", event.target.value.trim())} placeholder="https://... hoặc /uploads/..." />
                    {uploadingCover ? <span className="text-xs font-medium text-zinc-500">Đang tải ảnh...</span> : null}
                    {form.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.coverImageUrl} alt="Campaign cover preview" className="h-28 w-full rounded-xl border border-zinc-200 object-cover" />
                    ) : null}
                  </div>
                </SectionField>
                <div className="md:col-span-2">
                  <SectionField label="Mô tả ngắn" hint="Tóm tắt ngắn: mục tiêu, lợi ích, sản phẩm/voucher chính." error={fieldErrors.brief}>
                    <textarea className="dc-input min-h-28" value={form.brief} onChange={(event) => setField("brief", event.target.value)} placeholder="Mô tả ngắn gọn về chiến dịch, quà tặng, voucher, hàng tồn kho, hoặc mục tiêu kích hoạt..." />
                  </SectionField>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-white p-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-500">Chiến lược campaign</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <SectionField label="Mục tiêu campaign" hint="Nêu KPI chính, ví dụ tăng nhận diện hoặc tăng chuyển đổi." error={fieldErrors.objective}>
                    <textarea className="dc-input min-h-24" value={form.objective} onChange={(event) => setField("objective", event.target.value)} placeholder="vd: Tăng nhận biết, đẩy voucher, kích hoạt creator, xả tồn kho..." />
                  </SectionField>
                </div>
                <SectionField label="Kênh ưu tiên" hint="Nhập dạng danh sách, ngăn cách bằng dấu phẩy." error={fieldErrors.priorityChannels}>
                  <input className="dc-input" value={form.priorityChannels} onChange={(event) => setField("priorityChannels", event.target.value)} placeholder="vd: TikTok, Facebook, Livestream, Shop..." />
                </SectionField>
                <SectionField label="Loại nhiệm vụ" hint="Ví dụ: review, livestream, check-in, short video." error={fieldErrors.missionTypes}>
                  <input className="dc-input" value={form.missionTypes} onChange={(event) => setField("missionTypes", event.target.value)} placeholder="vd: review, check-in, share, video..." />
                </SectionField>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-white p-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-500">Ngân sách và lịch chạy</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SectionField label="Ngân sách dự kiến" hint="Đơn vị: VND. Chỉ nhập số, không nhập ký tự tiền tệ." error={fieldErrors.budgetVnd}>
                  <input className="dc-input" type="text" inputMode="numeric" placeholder="0" value={formatIntForInput(form.budgetVnd)} onChange={(event) => setField("budgetVnd", parseNonNegativeInt(event.target.value))} />
                </SectionField>
                <SectionField label="Ngân sách thưởng thêm" hint="Đơn vị: VND. Dùng cho bonus ngoài ngân sách chính." error={fieldErrors.bonusBudgetVnd}>
                  <input className="dc-input" type="text" inputMode="numeric" placeholder="0" value={formatIntForInput(form.bonusBudgetVnd)} onChange={(event) => setField("bonusBudgetVnd", parseNonNegativeInt(event.target.value))} />
                </SectionField>
                <SectionField label="Target amount" hint="Đơn vị: VND. Mục tiêu doanh thu/đóng góp kỳ vọng." error={fieldErrors.targetAmountVnd}>
                  <input className="dc-input" type="text" inputMode="numeric" placeholder="0" value={formatIntForInput(form.targetAmountVnd)} onChange={(event) => setField("targetAmountVnd", parseNonNegativeInt(event.target.value))} />
                </SectionField>
                <SectionField label="Loại campaign">
                  <select className="dc-input" value={form.campaignType} onChange={(event) => setField("campaignType", event.target.value as RequestForm["campaignType"])}>
                    <option value="COMMUNITY">{getCampaignTypeLabel()}</option>
                  </select>
                </SectionField>
                <SectionField label="Ngành hàng">
                  <select className="dc-input" value={form.category} onChange={(event) => setField("category", event.target.value as RequestForm["category"])}>
                    <option value="LIFESTYLE">Lifestyle</option>
                    <option value="FOOD">Food</option>
                    <option value="BEAUTY">Beauty</option>
                    <option value="FASHION">Fashion</option>
                    <option value="TECH">Tech</option>
                    <option value="EDUCATION">Education</option>
                  </select>
                </SectionField>
                <SectionField label="Hoa hồng Creator (%)" hint="Đơn vị: phần trăm (%), từ 0 đến 100." error={fieldErrors.creatorCommissionPercent}>
                  <input className="dc-input" type="text" inputMode="numeric" placeholder="0" value={form.creatorCommissionPercent === 0 ? "" : String(form.creatorCommissionPercent)} onChange={(event) => setField("creatorCommissionPercent", parsePercent(event.target.value))} />
                </SectionField>
                <SectionField label="Hoa hồng User (%)" hint="Đơn vị: phần trăm (%), từ 0 đến 100." error={fieldErrors.userCommissionPercent}>
                  <input className="dc-input" type="text" inputMode="numeric" placeholder="0" value={form.userCommissionPercent === 0 ? "" : String(form.userCommissionPercent)} onChange={(event) => setField("userCommissionPercent", parsePercent(event.target.value))} />
                </SectionField>
                <SectionField label="Ngày bắt đầu mong muốn" hint="Nhập theo lịch hệ thống, API lưu chuẩn ISO." error={fieldErrors.startsAt}>
                  <input className="dc-input" type="datetime-local" value={form.startsAt} onChange={(event) => setField("startsAt", event.target.value)} />
                </SectionField>
                <SectionField label="Ngày kết thúc mong muốn" hint="Nhập theo lịch hệ thống, API lưu chuẩn ISO." error={fieldErrors.endsAt}>
                  <input className="dc-input" type="datetime-local" value={form.endsAt} onChange={(event) => setField("endsAt", event.target.value)} />
                </SectionField>
              </div>
            </div>
          </div>

          <button className="dc-btn-primary w-fit" type="submit" disabled={saving}>
            {saving ? "Đang gửi..." : "Gửi yêu cầu cho Admin"}
          </button>
        </form>

        <section className="mt-8">
          <SectionHeader title="Danh sách yêu cầu campaign" subtitle={`Tổng ${requests.length} yêu cầu`} />
          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : requests.length === 0 ? (
            <EmptyState title="Chưa có yêu cầu campaign" description="Tạo yêu cầu để Admin tạo campaign và publish." />
          ) : (
            <div className="grid gap-4">
              {requests.map((request) => (
                <article key={request.id} className="dc-card grid gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">/{request.requestedSlug}</p>
                        <p className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                          {getCampaignTypeLabel()}
                        </p>
                        <p className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                          {request.category}
                        </p>
                      </div>
                      <h2 className="mt-1 text-xl font-black text-zinc-900">{request.title}</h2>
                      <p className="mt-1 text-sm text-zinc-600">{stripCoverImageMeta(request.brief)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-700">
                        {requestStatusLabel(request.status)}
                      </p>
                      <p className="text-xs text-zinc-500">Tạo lúc {formatDate(request.createdAt)}</p>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-zinc-600 md:grid-cols-2 xl:grid-cols-4">
                    <p>Đối tượng: <span className="font-semibold text-zinc-900">{request.objective || "Chưa khai báo"}</span></p>
                    <p>Kênh: <span className="font-semibold text-zinc-900">{request.priorityChannels || "Chưa khai báo"}</span></p>
                    <p>Nhiệm vụ: <span className="font-semibold text-zinc-900">{request.missionTypes || "Chưa khai báo"}</span></p>
                    <p>Hoa hồng Creator: <span className="font-semibold text-zinc-900">{request.creatorCommissionPercent}%</span></p>
                    <p>Hoa hồng User: <span className="font-semibold text-zinc-900">{request.userCommissionPercent}%</span></p>
                    <p>Thưởng thêm: <span className="font-semibold text-zinc-900">{request.bonusBudgetVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Ngân sách: <span className="font-semibold text-zinc-900">{request.budgetVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Target: <span className="font-semibold text-zinc-900">{request.targetAmountVnd.toLocaleString("vi-VN")}đ</span></p>
                    <p>Trạng thái duyệt: <span className="font-semibold text-zinc-900">{request.status}</span></p>
                    <p>Setup source: <span className="font-semibold text-zinc-900">{request.setupSource}</span></p>
                    <p>Cập nhật lúc: <span className="font-semibold text-zinc-900">{formatDate(request.updatedAt)}</span></p>
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
      </>
    </>
  );
}




