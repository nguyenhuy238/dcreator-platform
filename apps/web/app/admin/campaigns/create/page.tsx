"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RequiredHashtagInput } from "@/app/admin/campaigns/_components/RequiredHashtagInput";
import { ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";
import { campaignRequestMarkers, extractCampaignRequestMarkerValue } from "@/lib/campaign-request-meta";
import { getCampaignTypeLabel } from "@/lib/constants/campaign-type";
import {
  CAMPAIGN_FULFILLMENT_OPTIONS,
  type CampaignFulfillmentMode
} from "@/lib/constants/campaign-fulfillment";
import { DEFAULT_REQUIRED_HASHTAGS, normalizeRequiredHashtags, validateRequiredHashtags } from "@/lib/hashtags";

type CampaignCategory = "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
type CampaignType = "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
type SetupSource = "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";
type BrandOption = { id: string; brandId?: string; displayName: string; ownerDisplayName?: string; email: string };

type CreatorBriefForm = {
  productName: string;
  productDescription: string;
  productLink: string;
  productImageUrl: string;
};

type FormState = {
  brandAccountId: string;
  brandKeyword: string;
  slug: string;
  title: string;
  brief: string;
  requirementsSummary: string;
  requirements: string;
  category: CampaignCategory;
  campaignType: CampaignType;
  setupSource: SetupSource;
  fulfillmentMode: CampaignFulfillmentMode;
  requiredHashtags: string[];
  benefits: string;
  imageUrl: string;
  ugcVideoQuota: number;
  startsAt: string;
  endsAt: string;
  creatorBrief: CreatorBriefForm;
  publishNow: boolean;
};

type ApiResponse<T> = { success: true; data: T } | ApiFailure;
type ApiFailure = { success: false; error: string; code?: string; details?: unknown };
type FieldErrors = Record<string, string | undefined>;
type CampaignRequestItem = {
  id: string;
  requestedSlug: string;
  title: string;
  brief: string;
  objective: string | null;
  priorityChannels: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: "PENDING_REVIEW" | "NEEDS_REVISION" | "APPROVED" | "REJECTED";
  brand: { id: string; name: string | null; ownerAccountId: string; contactEmail: string | null };
};

const defaultForm: FormState = {
  brandAccountId: "",
  brandKeyword: "",
  slug: "",
  title: "",
  brief: "",
  requirementsSummary: "",
  requirements: "",
  category: "LIFESTYLE",
  campaignType: "COMMUNITY",
  setupSource: "BRAND_REQUESTED",
  fulfillmentMode: "BRAND_SHIP",
  requiredHashtags: DEFAULT_REQUIRED_HASHTAGS,
  benefits: "",
  imageUrl: "",
  ugcVideoQuota: 1,
  startsAt: "",
  endsAt: "",
  creatorBrief: {
    productName: "",
    productDescription: "",
    productLink: "",
    productImageUrl: ""
  },
  publishNow: true
};

function toDateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function toDateTimeLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const COVER_IMAGE_MARKER = campaignRequestMarkers.cover;
const CONTENT_FILE_MARKER = campaignRequestMarkers.content;
const REQUIREMENTS_MARKER = campaignRequestMarkers.requirements;

function extractMarker(brief: string, marker: string) {
  return extractCampaignRequestMarkerValue(brief, marker);
}

function extractRequirements(brief: string) {
  const value = extractMarker(brief, REQUIREMENTS_MARKER);
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const apiErrorFieldMap: Record<string, string> = {
  BRAND_ACCOUNT_NOT_FOUND: "brandAccountId",
  BRAND_ACCOUNT_INACTIVE: "brandAccountId",
  BRAND_PROFILE_NOT_FOUND: "brandAccountId",
  CAMPAIGN_TIMELINE_INVALID: "endsAt",
  CAMPAIGN_UGC_VIDEO_QUOTA_MIGRATION_REQUIRED: "ugcVideoQuota",
  CAMPAIGN_REQUIRED_HASHTAGS_MIGRATION_REQUIRED: "requiredHashtags"
};

const apiErrorMessageMap: Record<string, string> = {
  BRAND_ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản Brand.",
  BRAND_ACCOUNT_INACTIVE: "Tài khoản Brand đang bị vô hiệu hóa.",
  BRAND_PROFILE_NOT_FOUND: "Brand chưa hoàn tất onboarding.",
  CAMPAIGN_TIMELINE_INVALID: "Ngày kết thúc phải sau ngày bắt đầu.",
  CAMPAIGN_UGC_VIDEO_QUOTA_MIGRATION_REQUIRED: "Hệ thống chưa cập nhật quota video UGC. Vui lòng chạy migration trước khi tạo chiến dịch.",
  CAMPAIGN_REQUIRED_HASHTAGS_MIGRATION_REQUIRED: "Hệ thống chưa cập nhật hashtag bắt buộc. Vui lòng chạy migration trước khi tạo chiến dịch."
};

const vietnameseErrorMessages: Record<string, string> = {
  brandAccountId: "Vui lòng chọn tài khoản Brand.",
  slug: "Đường dẫn công khai chưa hợp lệ. Chỉ dùng chữ thường, số và dấu gạch ngang.",
  title: "Vui lòng nhập tên chiến dịch tối thiểu 3 ký tự.",
  requirementsSummary: "Yêu cầu ngắn tối đa 160 ký tự.",
  requirements: "Vui lòng nhập yêu cầu tối thiểu 3 ký tự.",
  benefits: "Vui lòng nhập quyền lợi tối thiểu 3 ký tự.",
  imageUrl: "Ảnh chưa hợp lệ. Vui lòng chọn file ảnh hoặc dùng URL /uploads, http, https.",
  ugcVideoQuota: "Số lượng video review phải lớn hơn 0.",
  startsAt: "Ngày bắt đầu chưa hợp lệ.",
  endsAt: "Ngày kết thúc phải sau ngày bắt đầu.",
  requiredHashtags: "Hashtag bắt buộc chưa hợp lệ.",
  productName: "Vui lòng nhập tên sản phẩm.",
  productDescription: "Vui lòng nhập mô tả sản phẩm.",
  productLink: "Vui lòng nhập link sản phẩm.",
  productImageUrl: "Vui lòng chọn ảnh sản phẩm."
};

function fieldErrorsText(message?: string) {
  return message?.trim();
}

function getApiFieldErrors(payload: ApiFailure) {
  const nextErrors: FieldErrors = {};
  const details = payload.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
  if (details?.fieldErrors) {
    for (const [field, messages] of Object.entries(details.fieldErrors)) {
      nextErrors[field] = vietnameseErrorMessages[field] ?? fieldErrorsText(messages[0]);
    }
  }
  const mappedField = payload.code ? apiErrorFieldMap[payload.code] : undefined;
  if (mappedField) {
    nextErrors[mappedField] = payload.code ? apiErrorMessageMap[payload.code] ?? fieldErrorsText(payload.error) : fieldErrorsText(payload.error);
  }
  return nextErrors;
}

export default function AdminCreateCampaignPage() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId")?.trim() ?? "";
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillNote, setPrefillNote] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState("");
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);

  const publicPathPreview = useMemo(() => `https://dcreator.vn/${form.slug || "..."}`, [form.slug]);

  function setField<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  function setCreatorBriefField<K extends keyof CreatorBriefForm>(name: K, value: CreatorBriefForm[K]) {
    setForm((current) => ({ ...current, creatorBrief: { ...current.creatorBrief, [name]: value } }));
    const fieldName = String(name);
    setFieldErrors((current) => ({ ...current, [fieldName]: undefined }));
  }

  useEffect(() => {
    if (!requestId) return;
    let mounted = true;

    async function loadRequestPrefill() {
      setPrefillLoading(true);
      setPrefillNote("");
      setError("");
      try {
        const response = await fetch("/api/admin/dashboard/campaign-reviews", { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse<CampaignRequestItem[]>;
        if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể tải yêu cầu chiến dịch" : fieldErrorsText(payload.error));
        const request = payload.data.find((item) => item.id === requestId);
        if (!request) throw new Error("Không tìm thấy yêu cầu chiến dịch để prefill.");

        const coverImageUrl = extractMarker(request.brief, COVER_IMAGE_MARKER);
        const contentFileUrl = extractMarker(request.brief, CONTENT_FILE_MARKER);
        if (!mounted) return;
        setForm((current) => ({
          ...current,
          brandAccountId: request.brand.ownerAccountId,
          brandKeyword: request.brand.name && request.brand.contactEmail ? `${request.brand.name} (${request.brand.contactEmail})` : current.brandKeyword,
          slug: request.requestedSlug || current.slug,
          title: request.title || current.title,
          brief: contentFileUrl ? `${request.brief}\n\nFile nội dung Brand gửi: ${contentFileUrl}` : request.brief || current.brief,
          requirementsSummary: current.requirementsSummary,
          requirements: extractRequirements(request.brief) || current.requirements,
          setupSource: "BRAND_REQUESTED",
          benefits: request.objective ?? current.benefits,
          imageUrl: coverImageUrl || current.imageUrl,
          startsAt: toDateTimeLocalInput(request.startsAt),
          endsAt: toDateTimeLocalInput(request.endsAt)
        }));
        setPrefillNote(`Đã nạp sẵn dữ liệu từ yêu cầu #${request.requestedSlug}. Vui lòng bổ sung đầy đủ trước khi tạo chiến dịch.`);
      } catch (prefillError) {
        if (!mounted) return;
        setError(prefillError instanceof Error ? prefillError.message : "Không thể nạp dữ liệu prefill từ yêu cầu.");
      } finally {
        if (mounted) setPrefillLoading(false);
      }
    }

    void loadRequestPrefill();
    return () => {
      mounted = false;
    };
  }, [requestId]);

  async function searchBrand(keyword: string) {
    const nextKeyword = keyword.trim();
    setField("brandKeyword", keyword);
    if (form.brandAccountId) setField("brandAccountId", "");
    if (nextKeyword.length < 1) {
      setBrandOptions([]);
      return;
    }
    const response = await fetch(`/api/admin/brand-accounts?query=${encodeURIComponent(nextKeyword)}`, { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<BrandOption[]>;
    if (!response.ok || !payload.success) return;
    setBrandOptions(payload.data);
  }

  async function uploadImage(file: File, target: "cover" | "product" = "cover") {
    if (target === "cover") setUploading(true);
    else setUploadingProductImage(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("logo", file);
      const response = await fetch("/api/uploads/brand-logo", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<{ logoUrl: string }>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Upload ảnh thất bại." : fieldErrorsText(payload.error));
      if (target === "cover") setField("imageUrl", payload.data.logoUrl);
      else setCreatorBriefField("productImageUrl", payload.data.logoUrl);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload ảnh thất bại.";
      setFieldErrors((current) => ({
        ...current,
        [target === "cover" ? "imageUrl" : "productImageUrl"]: fieldErrorsText(message) || "Upload ảnh thất bại."
      }));
      setError(fieldErrorsText(message) || "Upload ảnh thất bại.");
    } finally {
      if (target === "cover") setUploading(false);
      else setUploadingProductImage(false);
    }
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const imageUrl = form.imageUrl.trim();
    if (!form.brandAccountId.trim()) nextErrors.brandAccountId = "Vui lòng chọn Brand từ danh sách gợi ý.";
    if (form.slug.trim().length < 3) nextErrors.slug = "Slug cần tối thiểu 3 ký tự.";
    else if (!slugPattern.test(form.slug.trim())) nextErrors.slug = "Slug chỉ gồm chữ thường, số và dấu gạch ngang (-).";
    if (form.title.trim().length < 3) nextErrors.title = "Tên chiến dịch cần tối thiểu 3 ký tự.";
    if (form.requirementsSummary.trim().length > 160) nextErrors.requirementsSummary = "Yêu cầu ngắn tối đa 160 ký tự.";
    if (form.requirements.trim().length < 3) nextErrors.requirements = "Yêu cầu cần tối thiểu 3 ký tự.";
    if (form.benefits.trim().length < 3) nextErrors.benefits = "Quyền lợi cần tối thiểu 3 ký tự.";
    if (imageUrl && !imageUrl.startsWith("/uploads/") && !/^https?:\/\//.test(imageUrl)) {
      nextErrors.imageUrl = "Ảnh phải là URL bắt đầu bằng /uploads/ hoặc http(s)://";
    }
    if (!Number.isInteger(form.ugcVideoQuota) || form.ugcVideoQuota <= 0) {
      nextErrors.ugcVideoQuota = "Số lượng video review phải lớn hơn 0.";
    }
    const hashtagError = validateRequiredHashtags(form.requiredHashtags);
    if (hashtagError) nextErrors.requiredHashtags = hashtagError;
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      nextErrors.endsAt = "Ngày kết thúc phải sau ngày bắt đầu.";
    }
    if (!form.creatorBrief.productName.trim()) nextErrors.productName = "Vui lòng nhập tên sản phẩm.";
    if (!form.creatorBrief.productDescription.trim()) nextErrors.productDescription = "Vui lòng nhập mô tả sản phẩm.";
    if (!form.creatorBrief.productLink.trim()) nextErrors.productLink = "Vui lòng nhập link sản phẩm.";
    if (!form.creatorBrief.productImageUrl.trim()) nextErrors.productImageUrl = "Vui lòng chọn ảnh sản phẩm.";
    return nextErrors;
  }

  async function submit(event: FormEvent) {
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
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId || undefined,
          ...form,
          brief: null,
          requirementsSummary: form.requirementsSummary,
          requirements: form.requirements,
          publishNow: true,
          startsAt: toDateTime(form.startsAt),
          endsAt: toDateTime(form.endsAt),
          requiredHashtags: normalizeRequiredHashtags(form.requiredHashtags),
          productName: form.creatorBrief.productName,
          productDescription: form.creatorBrief.productDescription,
          productLink: form.creatorBrief.productLink,
          productImageUrl: form.creatorBrief.productImageUrl
        })
      });
      const payload = (await response.json()) as ApiResponse<{ id: string; title: string }>;
      if (!response.ok || !payload.success) {
        if (!payload.success) {
          const apiFieldErrors = getApiFieldErrors(payload);
          if (Object.values(apiFieldErrors).some(Boolean)) setFieldErrors(apiFieldErrors);
          throw new Error(fieldErrorsText(payload.error) || "Không thể tạo chiến dịch");
        }
        throw new Error("Không thể tạo chiến dịch");
      }
      setSuccess(`Đã tạo chiến dịch: ${payload.data.title}`);
      setForm(defaultForm);
      setFieldErrors({});
      setBrandOptions([]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo chiến dịch");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Tạo chiến dịch (Admin)"
        subtitle={requestId ? "Form đã prefill từ yêu cầu Brand. Admin cần bổ sung thông tin còn thiếu trước khi tạo." : "Admin có thể tạo chiến dịch trực tiếp theo cấu trúc mới."}
        action={<Link href="/admin/campaigns" className="dc-btn-secondary">Quay lại duyệt chiến dịch</Link>}
      />

      {error ? <div className="mt-4"><ErrorState title="Tạo chiến dịch thất bại" description={error} /></div> : null}
      {prefillLoading ? <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Đang nạp dữ liệu từ yêu cầu Brand...</p> : null}
      {prefillNote ? <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{prefillNote}</p> : null}
      {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <form className="dc-card mt-6 grid gap-4 p-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Tài khoản Brand</span>
            <input className={`dc-input ${fieldErrors.brandAccountId ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.brandKeyword} onChange={(event) => void searchBrand(event.target.value)} placeholder="Nhập tên brand để tìm" required />
            {brandOptions.length > 0 && !form.brandAccountId ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-2">
                {brandOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`mb-1 block w-full rounded-lg px-2 py-1 text-left text-sm ${form.brandAccountId === option.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}
                    onClick={() => {
                      setField("brandAccountId", option.id);
                      setField("brandKeyword", `${option.displayName} (${option.email})`);
                      setBrandOptions([]);
                    }}
                  >
                    {option.displayName} - {option.email}
                    {option.ownerDisplayName ? <span className="block text-xs opacity-75">Chủ tài khoản: {option.ownerDisplayName}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
            <span className="text-xs font-medium text-zinc-500">ID đã chọn: {form.brandAccountId || "Chưa chọn"}</span>
            {fieldErrors.brandAccountId ? <span className="text-xs text-red-600">{fieldErrors.brandAccountId}</span> : null}
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Đường dẫn công khai</span>
            <div className="flex overflow-hidden rounded-xl border border-zinc-200">
              <span className="bg-zinc-100 px-3 py-2 text-xs text-zinc-600">https://dcreator.vn/</span>
              <input className={`min-w-0 flex-1 px-3 py-2 text-sm outline-none ${fieldErrors.slug ? "border-l border-red-500 bg-red-50" : ""}`} value={form.slug} onChange={(event) => setField("slug", event.target.value)} placeholder="ten-chien-dich-cong-khai" required />
            </div>
            <span className="text-xs font-medium text-zinc-500">Preview: {publicPathPreview}</span>
            {fieldErrors.slug ? <span className="text-xs text-red-600">{fieldErrors.slug}</span> : null}
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Tên chiến dịch</span>
            <input className={`dc-input ${fieldErrors.title ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.title} onChange={(event) => setField("title", event.target.value)} required />
            {fieldErrors.title ? <span className="text-xs text-red-600">{fieldErrors.title}</span> : null}
          </label>

          <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Ngành hàng</span>
              <select className="dc-input" value={form.category} onChange={(event) => setField("category", event.target.value as CampaignCategory)}>
                <option value="LIFESTYLE">Lối sống</option>
                <option value="FOOD">Ẩm thực</option>
                <option value="BEAUTY">Làm đẹp</option>
                <option value="FASHION">Thời trang</option>
                <option value="TECH">Công nghệ</option>
                <option value="EDUCATION">Giáo dục</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Loại chiến dịch</span>
              <select className="dc-input" value={form.campaignType} onChange={(event) => setField("campaignType", event.target.value as CampaignType)}>
                <option value="COMMUNITY">{getCampaignTypeLabel()}</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Nguồn thiết lập</span>
              <select className="dc-input" value={form.setupSource} onChange={(event) => setField("setupSource", event.target.value as SetupSource)}>
                <option value="BRAND_REQUESTED">Brand yêu cầu</option>
                <option value="JOIN_EXISTING_DCREATOR_CAMP">Tham gia chiến dịch dCreator có sẵn</option>
              </select>
            </label>
          </div>

          <fieldset className="grid gap-3 md:col-span-2">
            <legend className="text-sm font-semibold text-zinc-700">Hình thức xử lý hàng mẫu / đơn hàng</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {CAMPAIGN_FULFILLMENT_OPTIONS.map((option) => {
                const selected = form.fulfillmentMode === option.value;
                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      selected ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900" : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        className="mt-1"
                        type="radio"
                        name="fulfillmentMode"
                        value={option.value}
                        checked={selected}
                        onChange={() => setField("fulfillmentMode", option.value)}
                      />
                      <span>
                        <span className="block text-sm font-bold text-zinc-900">{option.label}</span>
                        <span className="mt-2 block text-sm font-normal leading-6 text-zinc-600">{option.description}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {form.fulfillmentMode === "BRAND_SHIP" ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                Creator được duyệt sẽ có trạng thái yêu cầu tiền cọc. Hệ thống chưa tự động trừ ví.
              </p>
            ) : null}
          </fieldset>

          <div className="grid gap-3 text-sm font-semibold text-zinc-700 md:col-span-2 md:grid-cols-3">
            <label className="grid gap-2">
              <span>Tên sản phẩm</span>
              <input className="dc-input" value={form.creatorBrief.productName} onChange={(event) => setCreatorBriefField("productName", event.target.value)} required />
              {fieldErrors.productName ? <span className="text-xs text-red-600">{fieldErrors.productName}</span> : null}
            </label>
            <label className="grid gap-2">
              <span>Link sản phẩm</span>
              <input className="dc-input" value={form.creatorBrief.productLink} onChange={(event) => setCreatorBriefField("productLink", event.target.value)} placeholder="https://..." required />
              {fieldErrors.productLink ? <span className="text-xs text-red-600">{fieldErrors.productLink}</span> : null}
            </label>
            <label className="grid gap-2">
              <span>Hình ảnh sản phẩm</span>
              <input className="dc-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, "product"); }} required={!form.creatorBrief.productImageUrl} />
              {uploadingProductImage ? <span className="text-xs text-zinc-500">Đang tải ảnh sản phẩm...</span> : null}
              {fieldErrors.productImageUrl ? <span className="text-xs text-red-600">{fieldErrors.productImageUrl}</span> : null}
            </label>
            <label className="grid gap-2 md:col-span-3">
              <span>Mô tả sản phẩm</span>
              <textarea className="dc-input min-h-32" value={form.creatorBrief.productDescription} onChange={(event) => setCreatorBriefField("productDescription", event.target.value)} required />
              {fieldErrors.productDescription ? <span className="text-xs text-red-600">{fieldErrors.productDescription}</span> : null}
            </label>
          </div>

          <div className="md:col-span-2">
            <RequiredHashtagInput
              value={form.requiredHashtags}
              onChange={(value) => setField("requiredHashtags", value)}
              error={fieldErrors.requiredHashtags}
            />
          </div>

          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Yêu cầu ngắn hiển thị ở Tổng quan</span>
            <input
              className={`dc-input ${fieldErrors.requirementsSummary ? "border-red-500 ring-1 ring-red-300" : ""}`}
              value={form.requirementsSummary}
              onChange={(event) => setField("requirementsSummary", event.target.value)}
              placeholder="Ví dụ: 01 Video Review Sản Phẩm"
              maxLength={160}
            />
            <span className="text-xs font-medium text-zinc-500">Có thể để trống, hệ thống sẽ tự rút gọn từ yêu cầu chi tiết hoặc số lượng video review.</span>
            {fieldErrors.requirementsSummary ? <span className="text-xs text-red-600">{fieldErrors.requirementsSummary}</span> : null}
          </label>

          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Yêu cầu chi tiết từ Brand</span>
            <textarea className={`dc-input min-h-24 ${fieldErrors.requirements ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.requirements} onChange={(event) => setField("requirements", event.target.value)} required />
            {fieldErrors.requirements ? <span className="text-xs text-red-600">{fieldErrors.requirements}</span> : null}
          </label>

          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Quyền lợi</span>
            <textarea className={`dc-input min-h-24 ${fieldErrors.benefits ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.benefits} onChange={(event) => setField("benefits", event.target.value)} required />
            {fieldErrors.benefits ? <span className="text-xs text-red-600">{fieldErrors.benefits}</span> : null}
          </label>

          <div className="grid gap-4 md:col-span-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Ảnh</span>
              <input className="dc-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
              {uploading ? <span className="text-xs text-zinc-500">Đang tải ảnh...</span> : null}
              {fieldErrors.imageUrl ? <span className="text-xs text-red-600">{fieldErrors.imageUrl}</span> : null}
            </div>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Ngày bắt đầu</span>
              <input className={`dc-input ${fieldErrors.startsAt ? "border-red-500 ring-1 ring-red-300" : ""}`} type="datetime-local" value={form.startsAt} onChange={(event) => setField("startsAt", event.target.value)} />
              {fieldErrors.startsAt ? <span className="text-xs text-red-600">{fieldErrors.startsAt}</span> : null}
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Ngày kết thúc</span>
              <input className={`dc-input ${fieldErrors.endsAt ? "border-red-500 ring-1 ring-red-300" : ""}`} type="datetime-local" value={form.endsAt} onChange={(event) => setField("endsAt", event.target.value)} />
              {fieldErrors.endsAt ? <span className="text-xs text-red-600">{fieldErrors.endsAt}</span> : null}
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Số lượng video review</span>
              <input
                className={`dc-input ${fieldErrors.ugcVideoQuota ? "border-red-500 ring-1 ring-red-300" : ""}`}
                type="number"
                min={1}
                value={form.ugcVideoQuota}
                onChange={(event) => setField("ugcVideoQuota", Number(event.target.value || 0))}
              />
              {fieldErrors.ugcVideoQuota ? <span className="text-xs text-red-600">{fieldErrors.ugcVideoQuota}</span> : null}
            </label>
          </div>


        </div>

        <div className="flex justify-end">
          <button className="dc-btn-primary" type="submit" disabled={saving || uploading || uploadingProductImage}>
            {saving ? "Đang tạo..." : "Tạo chiến dịch"}
          </button>
        </div>
      </form>
    </>
  );
}
