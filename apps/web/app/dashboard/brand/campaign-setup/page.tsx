"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

type CampaignRequest = {
  id: string;
  requestedSlug: string;
  title: string;
  brief: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  adminNote: string | null;
  brandFeedback: string | null;
  createdCampaign: { id: string; slug: string; title: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
};

type RequestForm = {
  title: string;
  imageUrl: string;
  contentFileUrl: string;
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };
type FieldErrors = Partial<Record<keyof RequestForm, string>>;

const defaultForm: RequestForm = {
  title: "",
  imageUrl: "",
  contentFileUrl: ""
};

const CONTENT_FILE_MARKER = "[[CONTENT_FILE_URL]]:";

function getContentFileUrlFromBrief(brief: string) {
  const line = brief.split("\n").find((item) => item.trim().startsWith(CONTENT_FILE_MARKER));
  return line ? line.trim().slice(CONTENT_FILE_MARKER.length).trim() : "";
}

function requestStatusLabel(status: CampaignRequest["status"]) {
  if (status === "APPROVED") return "Admin đã tạo campaign";
  if (status === "REJECTED") return "Admin từ chối";
  if (status === "NEEDS_REVISION") return "Admin yêu cầu bổ sung";
  return "Chờ Admin xử lý";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default function CampaignSetupPage() {
  const [requests, setRequests] = useState<CampaignRequest[]>([]);
  const [form, setForm] = useState<RequestForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingContentFile, setUploadingContentFile] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState("");
  const [templateUrl, setTemplateUrl] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const [requestRes, templateRes] = await Promise.all([
        fetch("/api/brand/dashboard/campaign-requests", { cache: "no-store" }),
        fetch("/api/brand/dashboard/campaign-template", { cache: "no-store" })
      ]);
      const requestPayload = (await requestRes.json()) as ApiResponse<CampaignRequest[]>;
      const templatePayload = (await templateRes.json()) as ApiResponse<{ campaignContentTemplateUrl: string }>;
      if (!requestRes.ok || !requestPayload.success) throw new Error(requestPayload.success ? "Không thể tải yêu cầu campaign" : requestPayload.error);
      setRequests(requestPayload.data);
      if (templateRes.ok && templatePayload.success) setTemplateUrl(templatePayload.data.campaignContentTemplateUrl ?? "");
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
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};
    const imageUrl = form.imageUrl.trim();
    const contentFileUrl = form.contentFileUrl.trim();
    if (form.title.trim().length < 3) nextErrors.title = "Tên campaign cần tối thiểu 3 ký tự.";
    if (imageUrl && !imageUrl.startsWith("/uploads/") && !/^https?:\/\//.test(imageUrl)) {
      nextErrors.imageUrl = "Ảnh campaign phải bắt đầu bằng /uploads/ hoặc http(s)://";
    }
    if (!contentFileUrl) nextErrors.contentFileUrl = "Vui lòng tải lên hoặc dán link file nội dung campaign.";
    else if (!contentFileUrl.startsWith("/uploads/") && !/^https?:\/\//.test(contentFileUrl)) {
      nextErrors.contentFileUrl = "File nội dung phải bắt đầu bằng /uploads/ hoặc http(s)://";
    }
    return nextErrors;
  }

  async function createRequest(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateForm();
    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      setError("Vui lòng kiểm tra các trường được đánh dấu đỏ.");
      setSuccess("");
      return;
    }
    setSaving(true);
    setError("");
    setFieldErrors({});
    setSuccess("");
    try {
      const response = await fetch("/api/brand/dashboard/campaign-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = (await response.json()) as ApiResponse<CampaignRequest>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể gửi yêu cầu" : payload.error);
      setForm(defaultForm);
      setFieldErrors({});
      setSuccess("Đã gửi thông tin cho Admin để tạo campaign.");
      await loadRequests();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi yêu cầu");
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
      if (!response.ok || !payload.success || !payload.data?.logoUrl) throw new Error(payload.success ? "Không thể tải ảnh campaign" : payload.error);
      setField("imageUrl", payload.data.logoUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ảnh campaign");
    } finally {
      setUploadingCover(false);
    }
  }

  async function uploadCampaignContentFile(file: File) {
    setUploadingContentFile(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("contractDocument", file);
      const response = await fetch("/api/uploads/onboarding-doc", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<{ contractDocumentUrl: string }>;
      if (!response.ok || !payload.success || !payload.data?.contractDocumentUrl) throw new Error(payload.success ? "Không thể tải file nội dung campaign" : payload.error);
      setField("contentFileUrl", payload.data.contractDocumentUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải file nội dung campaign");
    } finally {
      setUploadingContentFile(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Gửi thông tin tạo campaign"
        subtitle="Brand chỉ cung cấp thông tin đầu vào, Admin sẽ trực tiếp tạo campaign trong hệ thống."
      />
      {error ? <ErrorState title="Không thể xử lý yêu cầu campaign" description={error} onRetry={() => void loadRequests()} /> : null}
      {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <form className="dc-card mt-6 grid gap-4 p-5 md:grid-cols-2" onSubmit={createRequest}>
        <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
          Tên campaign
          <input className={`dc-input ${fieldErrors.title ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="Nhập tên campaign" required />
          {fieldErrors.title ? <span className="text-xs text-red-600">{fieldErrors.title}</span> : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold text-zinc-700">
          Ảnh campaign
          <input className="dc-input bg-white" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file) void uploadCoverImage(file);
            event.currentTarget.value = "";
          }} disabled={uploadingCover} />
          <input className={`dc-input ${fieldErrors.imageUrl ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.imageUrl} onChange={(event) => setField("imageUrl", event.target.value.trim())} placeholder="/uploads/... hoặc https://..." />
          {fieldErrors.imageUrl ? <span className="text-xs text-red-600">{fieldErrors.imageUrl}</span> : null}
        </label>
        <label className="grid gap-2 text-sm font-semibold text-zinc-700">
          File nội dung campaign
          <input className="dc-input bg-white" type="file" accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg" onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file) void uploadCampaignContentFile(file);
            event.currentTarget.value = "";
          }} disabled={uploadingContentFile} />
          <input className={`dc-input ${fieldErrors.contentFileUrl ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.contentFileUrl} onChange={(event) => setField("contentFileUrl", event.target.value.trim())} placeholder="/uploads/... hoặc https://..." required />
          {fieldErrors.contentFileUrl ? <span className="text-xs text-red-600">{fieldErrors.contentFileUrl}</span> : null}
          {templateUrl ? (
            <a className="text-xs font-semibold text-sky-700 underline" href={`/api/uploads/onboarding-doc-download?url=${encodeURIComponent(templateUrl)}`} target="_blank" rel="noreferrer">
              Tải template form nội dung campaign
            </a>
          ) : (
            <span className="text-xs text-zinc-500">Template nội dung đang chờ Admin cấu hình.</span>
          )}
        </label>
        <div className="md:col-span-2">
          <button className="dc-btn-primary" type="submit" disabled={saving || uploadingCover || uploadingContentFile}>
            {saving ? "Đang gửi..." : "Gửi thông tin cho Admin"}
          </button>
        </div>
      </form>

      <section className="mt-8">
        <SectionHeader title="Lịch sử yêu cầu" subtitle={`Tổng ${requests.length} yêu cầu`} />
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : requests.length === 0 ? (
          <EmptyState title="Chưa có yêu cầu" description="Gửi thông tin để Admin tạo campaign giúp bạn." />
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <article key={request.id} className="dc-card grid gap-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">/{request.requestedSlug}</p>
                    <h2 className="mt-1 text-xl font-black text-zinc-900">{request.title}</h2>
                  </div>
                  <p className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-700">{requestStatusLabel(request.status)}</p>
                </div>
                {getContentFileUrlFromBrief(request.brief) ? (
                  <a className="w-fit rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100" href={`/api/uploads/onboarding-doc-download?url=${encodeURIComponent(getContentFileUrlFromBrief(request.brief))}`} target="_blank" rel="noreferrer">
                    Mở file nội dung đã gửi
                  </a>
                ) : null}
                {request.adminNote ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Admin phản hồi: {request.adminNote}</p> : null}
                {request.createdCampaign ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Campaign đã tạo: {request.createdCampaign.title} /{request.createdCampaign.slug}
                  </p>
                ) : null}
                <p className="text-xs text-zinc-500">Cập nhật: {formatDate(request.updatedAt)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
