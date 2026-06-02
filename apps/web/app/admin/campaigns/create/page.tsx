"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";
import { getCampaignTypeLabel } from "@/lib/constants/campaign-type";

type CampaignCategory = "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
type CampaignType = "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
type SetupSource = "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";
type ProductReceiveOption = "PRODUCT_REQUIRED" | "NO_PRODUCT_REQUIRED";
type BrandOption = { id: string; displayName: string; email: string };

type MissionForm = {
  title: string;
  description: string;
  audience: "CREATOR" | "USER";
  rewardCommissionVnd: number;
  rewardPoints: number;
  productReceiveOption: ProductReceiveOption;
  productName: string;
  productDescription: string;
  productLink: string;
  productImageUrl: string;
  allowRepeat: boolean;
  deadlineAt: string;
};

type FormState = {
  brandAccountId: string;
  brandKeyword: string;
  slug: string;
  title: string;
  brief: string;
  category: CampaignCategory;
  campaignType: CampaignType;
  setupSource: SetupSource;
  participationRoadmap: string[];
  benefits: string;
  imageUrl: string;
  ugcVideoQuota: number;
  startsAt: string;
  endsAt: string;
  mission: MissionForm;
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
  category: "LIFESTYLE",
  campaignType: "COMMUNITY",
  setupSource: "BRAND_REQUESTED",
  participationRoadmap: [""],
  benefits: "",
  imageUrl: "",
  ugcVideoQuota: 1,
  startsAt: "",
  endsAt: "",
  mission: {
    title: "",
    description: "",
    audience: "CREATOR",
    rewardCommissionVnd: 0,
    rewardPoints: 0,
    productReceiveOption: "PRODUCT_REQUIRED",
    productName: "",
    productDescription: "",
    productLink: "",
    productImageUrl: "",
    allowRepeat: false,
    deadlineAt: ""
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

const COVER_IMAGE_MARKER = "[[COVER_IMAGE_URL]]:";
const CONTENT_FILE_MARKER = "[[CONTENT_FILE_URL]]:";

function extractMarker(brief: string, marker: string) {
  const line = brief
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.startsWith(marker));
  return line ? line.slice(marker.length).trim() : "";
}

const apiErrorFieldMap: Record<string, string> = {
  BRAND_ACCOUNT_NOT_FOUND: "brandAccountId",
  BRAND_ACCOUNT_INACTIVE: "brandAccountId",
  BRAND_PROFILE_NOT_FOUND: "brandAccountId",
  CAMPAIGN_TIMELINE_INVALID: "endsAt",
  MISSION_DEADLINE_INVALID: "endsAt",
  CAMPAIGN_UGC_VIDEO_QUOTA_MIGRATION_REQUIRED: "ugcVideoQuota"
};

const apiErrorMessageMap: Record<string, string> = {
  BRAND_ACCOUNT_NOT_FOUND: "Không tìm thấy tài khoản Brand.",
  BRAND_ACCOUNT_INACTIVE: "Tài khoản Brand đang bị vô hiệu hóa.",
  BRAND_PROFILE_NOT_FOUND: "Brand chưa hoàn tất onboarding.",
  CAMPAIGN_TIMELINE_INVALID: "Ngày kết thúc phải sau ngày bắt đầu.",
  MISSION_DEADLINE_INVALID: "Hạn nộp nhiệm vụ phải nằm trong thời gian chiến dịch.",
  CAMPAIGN_UGC_VIDEO_QUOTA_MIGRATION_REQUIRED: "Hệ thống chưa cập nhật quota video UGC. Vui lòng chạy migration trước khi tạo chiến dịch."
};

const vietnameseErrorMessages: Record<string, string> = {
  brandAccountId: "Vui lòng chọn tài khoản Brand.",
  slug: "Đường dẫn công khai chưa hợp lệ. Chỉ dùng chữ thường, số và dấu gạch ngang.",
  title: "Vui lòng nhập tên chiến dịch tối thiểu 3 ký tự.",
  benefits: "Vui lòng nhập quyền lợi tối thiểu 3 ký tự.",
  imageUrl: "Ảnh chưa hợp lệ. Vui lòng chọn file ảnh hoặc dùng URL /uploads, http, https.",
  ugcVideoQuota: "Số lượng video review phải lớn hơn 0.",
  startsAt: "Ngày bắt đầu chưa hợp lệ.",
  endsAt: "Ngày kết thúc phải sau ngày bắt đầu.",
  participationRoadmap: "Vui lòng nhập ít nhất 1 bước lộ trình tham gia.",
  "mission.title": "Vui lòng nhập tên nhiệm vụ tối thiểu 3 ký tự.",
  "mission.description": "Vui lòng nhập mô tả nhiệm vụ tối thiểu 10 ký tự.",
  "mission.productName": "Vui lòng nhập tên sản phẩm.",
  "mission.productDescription": "Vui lòng nhập mô tả sản phẩm.",
  "mission.productLink": "Vui lòng nhập link sản phẩm.",
  "mission.productImageUrl": "Vui lòng chọn ảnh sản phẩm."
};

function fieldErrorsText(message?: string) {
  return message?.trim();
}

function getApiFieldErrors(payload: ApiFailure) {
  const nextErrors: FieldErrors = {};
  const details = payload.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
  if (details?.fieldErrors) {
    for (const [field, messages] of Object.entries(details.fieldErrors)) {
      const targetField = field === "mission" ? "mission.description" : field;
      nextErrors[targetField] = vietnameseErrorMessages[targetField] ?? fieldErrorsText(messages[0]);
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

  const publicPathPreview = useMemo(() => `https://dcreator-platform.vercel.app/${form.slug || "..."}`, [form.slug]);

  function setField<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  function setMissionField<K extends keyof MissionForm>(name: K, value: MissionForm[K]) {
    setForm((current) => ({ ...current, mission: { ...current.mission, [name]: value } }));
    setFieldErrors((current) => ({ ...current, [`mission.${String(name)}`]: undefined }));
  }

  function setRoadmapStep(index: number, value: string) {
    setForm((current) => ({
      ...current,
      participationRoadmap: current.participationRoadmap.map((item, idx) => (idx === index ? value : item))
    }));
    setFieldErrors((current) => ({ ...current, participationRoadmap: undefined }));
  }

  function addRoadmapStep() {
    setForm((current) => ({ ...current, participationRoadmap: [...current.participationRoadmap, ""] }));
  }

  function removeRoadmapStep(index: number) {
    setForm((current) => ({
      ...current,
      participationRoadmap: current.participationRoadmap.filter((_, idx) => idx !== index)
    }));
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
        const participationRoadmap = (request.priorityChannels ?? "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
        const normalizedRoadmap = participationRoadmap.length > 0 ? participationRoadmap : [""];

        if (!mounted) return;
        setForm((current) => ({
          ...current,
          brandAccountId: request.brand.ownerAccountId,
          brandKeyword: request.brand.name && request.brand.contactEmail ? `${request.brand.name} (${request.brand.contactEmail})` : current.brandKeyword,
          slug: request.requestedSlug || current.slug,
          title: request.title || current.title,
          brief: contentFileUrl ? `${request.brief}\n\nFile nội dung Brand gửi: ${contentFileUrl}` : request.brief || current.brief,
          setupSource: "BRAND_REQUESTED",
          participationRoadmap: normalizedRoadmap,
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
      else setMissionField("productImageUrl", payload.data.logoUrl);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload ảnh thất bại.";
      setFieldErrors((current) => ({
        ...current,
        [target === "cover" ? "imageUrl" : "mission.productImageUrl"]: fieldErrorsText(message) || "Upload ảnh thất bại."
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
    if (form.benefits.trim().length < 3) nextErrors.benefits = "Quyền lợi cần tối thiểu 3 ký tự.";
    if (imageUrl && !imageUrl.startsWith("/uploads/") && !/^https?:\/\//.test(imageUrl)) {
      nextErrors.imageUrl = "Ảnh phải là URL bắt đầu bằng /uploads/ hoặc http(s)://";
    }
    if (!Number.isInteger(form.ugcVideoQuota) || form.ugcVideoQuota <= 0) {
      nextErrors.ugcVideoQuota = "Số lượng video review phải lớn hơn 0.";
    }
    if (!form.participationRoadmap.some((item) => item.trim().length > 0)) {
      nextErrors.participationRoadmap = "Cần ít nhất 1 bước lộ trình tham gia.";
    }
    if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
      nextErrors.endsAt = "Ngày kết thúc phải sau ngày bắt đầu.";
    }
    if (form.mission.title.trim().length < 3) nextErrors["mission.title"] = "Tên nhiệm vụ cần tối thiểu 3 ký tự.";
    if (form.mission.description.trim().length < 10) nextErrors["mission.description"] = "Mô tả nhiệm vụ cần tối thiểu 10 ký tự.";
    if (form.mission.productReceiveOption === "PRODUCT_REQUIRED") {
      if (!form.mission.productName.trim()) nextErrors["mission.productName"] = "Vui lòng nhập tên sản phẩm.";
      if (!form.mission.productDescription.trim()) nextErrors["mission.productDescription"] = "Vui lòng nhập mô tả sản phẩm.";
      if (!form.mission.productLink.trim()) nextErrors["mission.productLink"] = "Vui lòng nhập link sản phẩm.";
      if (!form.mission.productImageUrl.trim()) nextErrors["mission.productImageUrl"] = "Vui lòng chọn ảnh sản phẩm.";
    }
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
          ...form,
          brief: null,
          publishNow: true,
          startsAt: toDateTime(form.startsAt),
          endsAt: toDateTime(form.endsAt),
          participationRoadmap: form.participationRoadmap.filter((item) => item.trim().length > 0),
          mission: {
            ...form.mission,
            productName: form.mission.productReceiveOption === "PRODUCT_REQUIRED" ? form.mission.productName : "",
            productDescription: form.mission.productReceiveOption === "PRODUCT_REQUIRED" ? form.mission.productDescription : "",
            productLink: form.mission.productReceiveOption === "PRODUCT_REQUIRED" ? form.mission.productLink : "",
            productImageUrl: form.mission.productReceiveOption === "PRODUCT_REQUIRED" ? form.mission.productImageUrl : "",
            audience: "CREATOR",
            deadlineAt: toDateTime(form.endsAt)
          }
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
              <span className="bg-zinc-100 px-3 py-2 text-xs text-zinc-600">https://dcreator-platform.vercel.app/</span>
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

          <div className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Lộ trình tham gia</span>
            {form.participationRoadmap.map((step, index) => (
              <div key={`step-${index}`} className="flex gap-2">
                <input className="dc-input" value={step} onChange={(event) => setRoadmapStep(index, event.target.value)} placeholder={`Bước ${index + 1}: ...`} />
                {form.participationRoadmap.length > 1 ? <button type="button" className="dc-btn-secondary" onClick={() => removeRoadmapStep(index)}>Xóa</button> : null}
              </div>
            ))}
            <button type="button" className="dc-btn-secondary w-fit" onClick={addRoadmapStep}>+ Thêm bước</button>
            {fieldErrors.participationRoadmap ? <span className="text-xs text-red-600">{fieldErrors.participationRoadmap}</span> : null}
          </div>

          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Quyền lợi</span>
            <textarea className={`dc-input min-h-24 ${fieldErrors.benefits ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.benefits} onChange={(event) => setField("benefits", event.target.value)} required />
            {fieldErrors.benefits ? <span className="text-xs text-red-600">{fieldErrors.benefits}</span> : null}
          </label>

          <div className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
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

          <section className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
            <h3 className="text-base font-semibold text-zinc-900">Nhiệm vụ của chiến dịch</h3>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Tên nhiệm vụ</span>
              <input className="dc-input" value={form.mission.title} onChange={(event) => setMissionField("title", event.target.value)} placeholder="Ví dụ: Quay video review 30 giây" required />
              {fieldErrors["mission.title"] ? <span className="text-xs text-red-600">{fieldErrors["mission.title"]}</span> : null}
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Mô tả nhiệm vụ</span>
              <textarea className="dc-input min-h-24" value={form.mission.description} onChange={(event) => setMissionField("description", event.target.value)} placeholder="Mô tả yêu cầu đầu ra và tiêu chí duyệt" required />
              {fieldErrors["mission.description"] ? <span className="text-xs text-red-600">{fieldErrors["mission.description"]}</span> : null}
            </label>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                <span>Sản phẩm</span>
                <select className="dc-input" value={form.mission.productReceiveOption} onChange={(event) => setMissionField("productReceiveOption", event.target.value as ProductReceiveOption)}>
                  <option value="PRODUCT_REQUIRED">Có yêu cầu</option>
                  <option value="NO_PRODUCT_REQUIRED">Không yêu cầu</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                <span>Thưởng điểm (N-Points)</span>
                <input className="dc-input" type="number" min={0} value={form.mission.rewardPoints} onChange={(event) => setMissionField("rewardPoints", Number(event.target.value || 0))} />
              </label>
              <div className="grid gap-2 text-sm font-semibold text-zinc-700">
                <span className="invisible select-none">Cho phép làm lại</span>

                <label className="inline-flex h-[42px] w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.mission.allowRepeat}
                    onChange={(event) => setMissionField("allowRepeat", event.target.checked)}
                  />
                  Cho phép làm lại
                </label>
              </div>
            </div>

            {form.mission.productReceiveOption === "PRODUCT_REQUIRED" ? (
              <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-3 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                  <span>Tên sản phẩm</span>
                  <input
                    className="dc-input"
                    value={form.mission.productName}
                    onChange={(event) => setMissionField("productName", event.target.value)}
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                  <span>Link sản phẩm</span>
                  <input
                    className="dc-input"
                    value={form.mission.productLink}
                    onChange={(event) => setMissionField("productLink", event.target.value)}
                    placeholder="https://..."
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                  <span>Hình ảnh sản phẩm</span>
                  <input
                    className="dc-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file, "product");
                    }}
                    required={!form.mission.productImageUrl}
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-3">
                  <span>Mô tả sản phẩm</span>
                  <textarea
                    className="dc-input min-h-32"
                    value={form.mission.productDescription}
                    onChange={(event) => setMissionField("productDescription", event.target.value)}
                    required
                  />
                </label>
              </div>
            ) : null}
          </section>
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
