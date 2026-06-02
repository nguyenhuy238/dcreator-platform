"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";

type CampaignCategory = "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
type CampaignType = "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
type SetupSource = "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";
type ProductReceiveOption = "PRODUCT_REQUIRED" | "NO_PRODUCT_REQUIRED";

type ApiFailure = { success: false; error: string; code?: string; details?: unknown };
type ApiResponse<T> = { success: true; data: T } | ApiFailure;
type FieldErrors = Record<string, string | undefined>;
type ImageSelectionState = {
  source: "existing" | "upload" | "none";
  fileName: string;
};

type MissionForm = {
  title: string;
  description: string;
  rewardPoints: number;
  rewardCommissionVnd: number;
  productReceiveOption: ProductReceiveOption;
  productName: string;
  productDescription: string;
  productLink: string;
  productImageUrl: string;
  allowRepeat: boolean;
};

type FormState = {
  slug: string;
  title: string;
  category: CampaignCategory;
  campaignType: CampaignType;
  setupSource: SetupSource;
  benefits: string;
  participationRoadmap: string[];
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  ugcVideoQuota: number;
  mission: MissionForm;
};

type CampaignDetail = {
  id: string;
  slug: string;
  title: string;
  category: CampaignCategory;
  campaignType: CampaignType;
  setupSource: SetupSource;
  benefits: string | null;
  participationRoadmap: string[];
  coverImageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  statusView: string;
  ugcVideoQuota: number | null;
  brand: { id: string; displayName: string; email: string };
  missions: Array<{
    id: string;
    title: string;
    description: string;
    rewardPoints: number;
    rewardCommissionVnd: number;
    productReceiveOption: ProductReceiveOption;
    productName: string | null;
    productDescription: string | null;
    productLink: string | null;
    productImageUrl: string | null;
    allowRepeat: boolean;
  }>;
};

const DEFAULT_FORM: FormState = {
  slug: "",
  title: "",
  category: "LIFESTYLE",
  campaignType: "COMMUNITY",
  setupSource: "BRAND_REQUESTED",
  benefits: "",
  participationRoadmap: [""],
  imageUrl: "",
  startsAt: "",
  endsAt: "",
  ugcVideoQuota: 1,
  mission: {
    title: "",
    description: "",
    rewardPoints: 0,
    rewardCommissionVnd: 0,
    productReceiveOption: "PRODUCT_REQUIRED",
    productName: "",
    productDescription: "",
    productLink: "",
    productImageUrl: "",
    allowRepeat: false
  }
};

const apiErrorFieldMap: Record<string, string> = {
  CAMPAIGN_TIMELINE_INVALID: "endsAt",
  MISSION_DEADLINE_INVALID: "endsAt",
  CAMPAIGN_UGC_VIDEO_QUOTA_MIGRATION_REQUIRED: "ugcVideoQuota"
};

const apiErrorMessageMap: Record<string, string> = {
  CAMPAIGN_TIMELINE_INVALID: "Ngày kết thúc phải sau ngày bắt đầu.",
  MISSION_DEADLINE_INVALID: "Hạn nộp nhiệm vụ phải nằm trong thời gian chiến dịch.",
  CAMPAIGN_UGC_VIDEO_QUOTA_MIGRATION_REQUIRED: "Hệ thống chưa cập nhật quota video UGC. Vui lòng chạy migration trước khi lưu thay đổi."
};

const fieldMessageMap: Record<string, string> = {
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

function fieldErrorsText(message?: string) {
  return message?.trim();
}

function buildMissionForm(mission?: CampaignDetail["missions"][number]): MissionForm {
  return {
    title: mission?.title ?? "",
    description: mission?.description ?? "",
    rewardPoints: mission?.rewardPoints ?? 0,
    rewardCommissionVnd: mission?.rewardCommissionVnd ?? 0,
    productReceiveOption: mission?.productReceiveOption ?? "PRODUCT_REQUIRED",
    productName: mission?.productName ?? "",
    productDescription: mission?.productDescription ?? "",
    productLink: mission?.productLink ?? "",
    productImageUrl: mission?.productImageUrl ?? "",
    allowRepeat: mission?.allowRepeat ?? false
  };
}

function buildForm(item: CampaignDetail): FormState {
  return {
    slug: item.slug,
    title: item.title,
    category: item.category,
    campaignType: item.campaignType,
    setupSource: item.setupSource,
    benefits: item.benefits ?? "",
    participationRoadmap: item.participationRoadmap.length > 0 ? item.participationRoadmap : [""],
    imageUrl: item.coverImageUrl ?? "",
    startsAt: toDateTimeLocalInput(item.startsAt),
    endsAt: toDateTimeLocalInput(item.endsAt),
    ugcVideoQuota: item.ugcVideoQuota ?? 1,
    mission: buildMissionForm(item.missions[0])
  };
}

function getApiFieldErrors(payload: ApiFailure) {
  const nextErrors: FieldErrors = {};
  const details = payload.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
  if (details?.fieldErrors) {
    for (const [field, messages] of Object.entries(details.fieldErrors)) {
      const targetField = field === "mission" ? "mission.description" : field;
      nextErrors[targetField] = fieldMessageMap[targetField] ?? fieldErrorsText(messages[0]);
    }
  }
  const mappedField = payload.code ? apiErrorFieldMap[payload.code] : undefined;
  if (mappedField) {
    nextErrors[mappedField] = payload.code ? apiErrorMessageMap[payload.code] ?? fieldErrorsText(payload.error) : fieldErrorsText(payload.error);
  }
  return nextErrors;
}

export default function AdminCampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [item, setItem] = useState<CampaignDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmAction, setConfirmAction] = useState<null | "pause" | "reject" | "request-changes">(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [coverImageState, setCoverImageState] = useState<ImageSelectionState>({ source: "none", fileName: "" });
  const [productImageState, setProductImageState] = useState<ImageSelectionState>({ source: "none", fileName: "" });

  const loadCampaign = useCallback(async () => {
    if (!id) return null;
    const res = await fetch(`/api/admin/campaigns/${id}`, { cache: "no-store" });
    const body = (await res.json()) as ApiResponse<CampaignDetail>;
    if (!res.ok || !body.success) throw new Error(body.success ? "Tải chi tiết chiến dịch thất bại" : fieldErrorsText(body.error) || "Tải chi tiết chiến dịch thất bại");
    return body.data;
  }, [id]);

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      setLoading(true);
      setError("");
      try {
        const data = await loadCampaign();
        if (!mounted || !data) return;
        setItem(data);
        setForm(buildForm(data));
        setCoverImageState({ source: data.coverImageUrl ? "existing" : "none", fileName: "" });
        setProductImageState({ source: data.missions[0]?.productImageUrl ? "existing" : "none", fileName: "" });
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Tải chi tiết chiến dịch thất bại");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadInitial();
    return () => {
      mounted = false;
    };
  }, [loadCampaign]);

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

  async function uploadImage(file: File, target: "cover" | "product" = "cover") {
    if (target === "cover") setUploadingCover(true);
    else setUploadingProductImage(true);
    setError("");
    if (target === "cover") setCoverImageState({ source: "upload", fileName: file.name });
    else setProductImageState({ source: "upload", fileName: file.name });
    try {
      const formData = new FormData();
      formData.set("logo", file);
      const response = await fetch("/api/uploads/brand-logo", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<{ logoUrl: string }>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Upload ảnh thất bại." : fieldErrorsText(payload.error) || "Upload ảnh thất bại.");
      if (target === "cover") setField("imageUrl", payload.data.logoUrl);
      else setMissionField("productImageUrl", payload.data.logoUrl);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Upload ảnh thất bại.";
      const targetField = target === "cover" ? "imageUrl" : "mission.productImageUrl";
      if (target === "cover") setCoverImageState({ source: item?.coverImageUrl ? "existing" : "none", fileName: "" });
      else setProductImageState({ source: item?.missions[0]?.productImageUrl ? "existing" : "none", fileName: "" });
      setFieldErrors((current) => ({ ...current, [targetField]: fieldErrorsText(message) || "Upload ảnh thất bại." }));
      setError(fieldErrorsText(message) || "Upload ảnh thất bại.");
    } finally {
      if (target === "cover") setUploadingCover(false);
      else setUploadingProductImage(false);
    }
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const imageUrl = form.imageUrl.trim();

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

  async function saveCampaign() {
    if (!item) return;
    const nextErrors = validateForm();
    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      setError("Vui lòng kiểm tra các trường được đánh dấu đỏ.");
      return;
    }
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      const response = await fetch(`/api/admin/campaigns/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug,
          title: form.title,
          category: form.category,
          campaignType: form.campaignType,
          setupSource: form.setupSource,
          benefits: form.benefits,
          participationRoadmap: form.participationRoadmap.filter((step) => step.trim().length > 0),
          imageUrl: form.imageUrl,
          startsAt: toDateTime(form.startsAt),
          endsAt: toDateTime(form.endsAt),
          ugcVideoQuota: form.ugcVideoQuota,
          mission: {
            title: form.mission.title,
            description: form.mission.description,
            rewardPoints: form.mission.rewardPoints,
            rewardCommissionVnd: form.mission.rewardCommissionVnd,
            productReceiveOption: form.mission.productReceiveOption,
            productName: form.mission.productReceiveOption === "PRODUCT_REQUIRED" ? form.mission.productName : "",
            productDescription: form.mission.productReceiveOption === "PRODUCT_REQUIRED" ? form.mission.productDescription : "",
            productLink: form.mission.productReceiveOption === "PRODUCT_REQUIRED" ? form.mission.productLink : "",
            productImageUrl: form.mission.productReceiveOption === "PRODUCT_REQUIRED" ? form.mission.productImageUrl : "",
            allowRepeat: form.mission.allowRepeat
          }
        })
      });
      const payload = (await response.json()) as ApiResponse<CampaignDetail>;
      if (!response.ok || !payload.success) {
        if (!payload.success) {
          const apiFieldErrors = getApiFieldErrors(payload);
          if (Object.values(apiFieldErrors).some(Boolean)) setFieldErrors(apiFieldErrors);
          throw new Error(fieldErrorsText(payload.error) || "Không thể cập nhật chiến dịch");
        }
        throw new Error("Không thể cập nhật chiến dịch");
      }
      const refreshed = await loadCampaign();
      if (refreshed) {
        setItem(refreshed);
        setForm(buildForm(refreshed));
      }
      setToast("Đã cập nhật chiến dịch");
      setTimeout(() => setToast(""), 1800);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể cập nhật chiến dịch");
    } finally {
      setSaving(false);
    }
  }

  async function act(action: "approve" | "reject" | "request-changes" | "pause", reason?: string) {
    if (!item) return;
    if (action !== "approve" && !reason?.trim()) {
      setError("Vui lòng nhập lý do.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaigns/${item.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "approve" ? JSON.stringify({}) : JSON.stringify({ reason: reason?.trim() })
      });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !body.success) throw new Error(body.success ? "Thao tác thất bại" : fieldErrorsText(body.error) || "Thao tác thất bại");
      setToast("Đã cập nhật trạng thái chiến dịch");
      setTimeout(() => setToast(""), 1800);
      const refreshed = await loadCampaign();
      if (refreshed) {
        setItem(refreshed);
        setForm(buildForm(refreshed));
      }
    } catch (actError) {
      setError(actError instanceof Error ? actError.message : "Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Chi tiết chiến dịch" subtitle="Đang tải dữ liệu..." />
        <LoadingSkeleton rows={8} />
      </>
    );
  }

  if (error && !item) {
    return <ErrorState title="Không tải được chiến dịch" description={error} onRetry={() => window.location.reload()} />;
  }

  if (!item) {
    return <ErrorState title="Không tải được chiến dịch" description="Không tìm thấy dữ liệu." onRetry={() => window.location.reload()} />;
  }

  return (
    <>
      <PageHeader
        title="Chỉnh sửa chiến dịch"
        subtitle={`Brand: ${item.brand.displayName} • ${item.slug}`}
        action={
          <div className="flex flex-wrap gap-2">
            <button className="dc-btn-secondary" onClick={() => router.push(`/admin/campaigns/${item.id}/applications`)}>
              Đơn đăng ký
            </button>
            <button className="dc-btn-secondary" onClick={() => router.push("/admin/campaigns")}>
              Quay lại
            </button>
          </div>
        }
      />

      {error ? (
        <div className="mt-4">
          <ErrorState title="Có lỗi thao tác" description={error} onRetry={() => window.location.reload()} />
        </div>
      ) : null}
      {toast ? <ActionToast message={toast} /> : null}

      <section className="mt-4 grid gap-4">
        <div className="dc-card p-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-500">Chỉnh sửa chiến dịch</p>
              <h2 className="text-lg font-semibold text-zinc-900">Thông tin chiến dịch</h2>
              <p className="mt-1 text-sm text-zinc-600">Brand: {item.brand.displayName}</p>
            </div>
            <div className="shrink-0">
              <StatusBadge status={item.statusView.toLowerCase()} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Tài khoản Brand</span>
              <input
                className="dc-input !bg-zinc-200 !border-zinc-300 !text-zinc-500 opacity-100 cursor-not-allowed"
                value={item.brand.displayName}
                readOnly
                disabled
              />
              <span className="invisible text-xs">Giữ dòng cân với Slug</span>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Slug</span>
              <input className={`dc-input ${fieldErrors.slug ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.slug} onChange={(event) => setField("slug", event.target.value)} />
              <span className="text-xs text-zinc-500">Link xem trước: https://dcreator.vn/{form.slug || "..."}</span>
              {fieldErrors.slug ? <span className="text-xs text-red-600">{fieldErrors.slug}</span> : null}
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Tên chiến dịch</span>
              <input className={`dc-input ${fieldErrors.title ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.title} onChange={(event) => setField("title", event.target.value)} />
              {fieldErrors.title ? <span className="text-xs text-red-600">{fieldErrors.title}</span> : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Danh mục</span>
              <select className="dc-input" value={form.category} onChange={(event) => setField("category", event.target.value as CampaignCategory)}>
                {["TECH", "FASHION", "FOOD", "BEAUTY", "LIFESTYLE", "EDUCATION"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Loại chiến dịch</span>
              <select className="dc-input" value={form.campaignType} onChange={(event) => setField("campaignType", event.target.value as CampaignType)}>
                {[
                  ["DONATION", "Ủng hộ"],
                  ["PREORDER", "Đặt trước"],
                  ["SPONSORSHIP", "Tài trợ"],
                  ["COMMUNITY", "Video seeding"]
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Nguồn thiết lập</span>
              <select className="dc-input" value={form.setupSource} onChange={(event) => setField("setupSource", event.target.value as SetupSource)}>
                <option value="BRAND_REQUESTED">Brand yêu cầu</option>
                <option value="JOIN_EXISTING_DCREATOR_CAMP">Gia nhập chiến dịch có sẵn</option>
              </select>
            </label>
            <div />

            <div className="md:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-700">Lộ trình tham gia</span>
              </div>
              <div className="grid gap-2">
                {form.participationRoadmap.map((step, index) => (
                  <div key={`roadmap-${index}`} className="flex gap-2">
                    <input className="dc-input" value={step} onChange={(event) => setRoadmapStep(index, event.target.value)} placeholder={`Bước ${index + 1}: ...`} />
                    {form.participationRoadmap.length > 1 ? (
                      <button type="button" className="dc-btn-secondary" onClick={() => removeRoadmapStep(index)}>
                        Xóa
                      </button>
                    ) : null}
                  </div>
                ))}
                <button type="button" className="dc-btn-secondary w-fit" onClick={addRoadmapStep}>
                  + Thêm bước
                </button>
                {fieldErrors.participationRoadmap ? <span className="text-xs text-red-600">{fieldErrors.participationRoadmap}</span> : null}
              </div>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
              <span>Quyền lợi</span>
              <textarea className={`dc-input min-h-24 ${fieldErrors.benefits ? "border-red-500 ring-1 ring-red-300" : ""}`} value={form.benefits} onChange={(event) => setField("benefits", event.target.value)} />
              {fieldErrors.benefits ? <span className="text-xs text-red-600">{fieldErrors.benefits}</span> : null}
            </label>

            <div className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
              <span>Ảnh chiến dịch</span>
              <input
                className="dc-input bg-white"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadImage(file);
                }}
              />
              {coverImageState.source === "existing" ? (
                <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  Đang dùng ảnh hiện tại của dự án
                </span>
              ) : null}
              {coverImageState.source === "upload" ? (
                <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
                  Đã chọn ảnh mới: {coverImageState.fileName}
                </span>
              ) : null}
              <span className="text-xs text-zinc-500">
                {item.coverImageUrl ? (
                  <>
                    Đang có ảnh sẵn.{" "}
                    <button
                      type="button"
                      className="font-semibold text-zinc-900 underline underline-offset-2"
                      onClick={() => {
                        setField("imageUrl", item.coverImageUrl ?? "");
                        setCoverImageState({ source: "existing", fileName: "" });
                      }}
                    >
                      Chọn ảnh hiện tại
                    </button>
                  </>
                ) : (
                  "Chưa có ảnh hiện tại. Vui lòng tải ảnh mới."
                )}
              </span>
              {uploadingCover ? <span className="text-xs text-zinc-500">Đang tải ảnh...</span> : null}
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
              <span>Số lượng video UGC</span>
              <input className={`dc-input ${fieldErrors.ugcVideoQuota ? "border-red-500 ring-1 ring-red-300" : ""}`} type="number" min={1} value={form.ugcVideoQuota} onChange={(event) => setField("ugcVideoQuota", Number(event.target.value || 0))} />
              {fieldErrors.ugcVideoQuota ? <span className="text-xs text-red-600">{fieldErrors.ugcVideoQuota}</span> : null}
            </label>
          </div>
        </div>

        <div className="dc-card p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-zinc-500">Chỉnh sửa nhiệm vụ</p>
            <h2 className="text-lg font-semibold text-zinc-900">Thông tin nhiệm vụ</h2>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Tên nhiệm vụ</span>
              <input className="dc-input" value={form.mission.title} onChange={(event) => setMissionField("title", event.target.value)} />
              {fieldErrors["mission.title"] ? <span className="text-xs text-red-600">{fieldErrors["mission.title"]}</span> : null}
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <span>Mô tả nhiệm vụ</span>
              <textarea className="dc-input min-h-24" value={form.mission.description} onChange={(event) => setMissionField("description", event.target.value)} />
              {fieldErrors["mission.description"] ? <span className="text-xs text-red-600">{fieldErrors["mission.description"]}</span> : null}
            </label>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                <span>Yêu cầu sản phẩm</span>
                <select className="dc-input" value={form.mission.productReceiveOption} onChange={(event) => setMissionField("productReceiveOption", event.target.value as ProductReceiveOption)}>
                  <option value="PRODUCT_REQUIRED">Có yêu cầu</option>
                  <option value="NO_PRODUCT_REQUIRED">Không yêu cầu</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                <span>Thưởng điểm (N-Points)</span>
                <input className="dc-input" type="number" min={0} value={form.mission.rewardPoints} onChange={(event) => setMissionField("rewardPoints", Number(event.target.value || 0))} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
              <div className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-700">
                  &nbsp;
                </span>

                <label className="flex h-[42px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.mission.allowRepeat}
                    onChange={(event) => setMissionField("allowRepeat", event.target.checked)}
                  />
                  Cho phép làm lại
                </label>
              </div>
            </label>
            </div>

            {form.mission.productReceiveOption === "PRODUCT_REQUIRED" ? (
              <div className="grid items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                  <span>Tên sản phẩm</span>
                  <input className="dc-input" value={form.mission.productName} onChange={(event) => setMissionField("productName", event.target.value)} />
                  {fieldErrors["mission.productName"] ? <span className="text-xs text-red-600">{fieldErrors["mission.productName"]}</span> : null}
                </label>
                
                <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                  <span>Link sản phẩm</span>
                  <input className="dc-input" value={form.mission.productLink} onChange={(event) => setMissionField("productLink", event.target.value)} placeholder="https://..." />
                  {fieldErrors["mission.productLink"] ? <span className="text-xs text-red-600">{fieldErrors["mission.productLink"]}</span> : null}
                </label>
                <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                  <span>Hình ảnh sản phẩm</span>
                  <input
                    className="dc-input bg-white"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file, "product");
                    }}
                  />
                  {productImageState.source === "existing" ? (
                    <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                      Đang dùng ảnh sản phẩm hiện tại
                    </span>
                  ) : null}
                  {productImageState.source === "upload" ? (
                    <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
                      Đã chọn ảnh mới: {productImageState.fileName}
                    </span>
                  ) : null}
                  <span className="text-xs text-zinc-500">
                    {item.missions[0]?.productImageUrl ? (
                      <>
                        Đang có ảnh sản phẩm sẵn.{" "}
                        <button
                          type="button"
                          className="font-semibold text-zinc-900 underline underline-offset-2"
                          onClick={() => {
                            setMissionField("productImageUrl", item.missions[0]?.productImageUrl ?? "");
                            setProductImageState({ source: "existing", fileName: "" });
                          }}
                        >
                          Chọn ảnh hiện tại
                        </button>
                      </>
                    ) : (
                      "Chưa có ảnh sản phẩm hiện tại. Vui lòng tải ảnh mới."
                    )}
                  </span>
                  {uploadingProductImage ? <span className="text-xs text-zinc-500">Đang tải ảnh sản phẩm...</span> : null}
                  {fieldErrors["mission.productImageUrl"] ? <span className="text-xs text-red-600">{fieldErrors["mission.productImageUrl"]}</span> : null}
                </label>
                <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                  <span>Mô tả sản phẩm</span>
                  <textarea className="dc-input min-h-24" value={form.mission.productDescription} onChange={(event) => setMissionField("productDescription", event.target.value)} />
                  {fieldErrors["mission.productDescription"] ? <span className="text-xs text-red-600">{fieldErrors["mission.productDescription"]}</span> : null}
                </label>
              </div>
            ) : null}
          </div>
        </div>

        <div className="dc-card p-4">
          <p className="text-sm font-semibold text-zinc-500">Lưu thay đổi</p>
          <button className="dc-btn-primary mt-3 w-fit px-4 py-2" onClick={() => void saveCampaign()} disabled={saving || uploadingCover || uploadingProductImage}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
          <p className="mt-3 text-sm text-zinc-600">Những thay đổi ở đây sẽ cập nhật trực tiếp lên chiến dịch và nhiệm vụ hiện có.</p>
        </div>

        <div className="dc-card p-4">
          <p className="text-sm font-semibold text-zinc-500">Điều khiển</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="dc-btn-primary" disabled={saving} onClick={() => void act("approve")}>
              Duyệt và xuất bản
            </button>
            <button className="dc-btn-secondary" disabled={saving} onClick={() => setConfirmAction("request-changes")}>
              Yêu cầu chỉnh sửa
            </button>
            <button className="dc-btn-secondary" disabled={saving} onClick={() => setConfirmAction("pause")}>
              Tạm dừng
            </button>
            <button className="dc-btn-secondary" disabled={saving} onClick={() => setConfirmAction("reject")}>
              Từ chối
            </button>
          </div>
        </div>
      </section>

      <ReviewActionDialog
        open={confirmAction === "pause"}
        title="Tạm dừng chiến dịch?"
        description="Chiến dịch sẽ tạm dừng hiển thị và vận hành."
        confirmLabel="Tạm dừng chiến dịch"
        requireReason
        reasonPlaceholder="Nêu rõ lý do tạm dừng chiến dịch..."
        submitting={saving}
        onCancel={() => !saving && setConfirmAction(null)}
        onConfirm={(reason) => {
          setConfirmAction(null);
          void act("pause", reason);
        }}
      />
      <ReviewActionDialog
        open={confirmAction === "reject"}
        title="Từ chối chiến dịch?"
        description="Chiến dịch sẽ bị từ chối và cần tạo hoặc chỉnh lại theo policy."
        confirmLabel="Từ chối chiến dịch"
        requireReason
        reasonPlaceholder="Nêu rõ lý do từ chối chiến dịch..."
        submitting={saving}
        onCancel={() => !saving && setConfirmAction(null)}
        onConfirm={(reason) => {
          setConfirmAction(null);
          void act("reject", reason);
        }}
      />
      <ReviewActionDialog
        open={confirmAction === "request-changes"}
        title="Yêu cầu chỉnh sửa chiến dịch?"
        description="Chiến dịch sẽ được trả về trạng thái cần chỉnh sửa."
        confirmLabel="Yêu cầu chỉnh sửa"
        requireReason
        reasonPlaceholder="Nêu rõ nội dung cần Brand chỉnh sửa..."
        submitting={saving}
        onCancel={() => !saving && setConfirmAction(null)}
        onConfirm={(reason) => {
          setConfirmAction(null);
          void act("request-changes", reason);
        }}
      />
    </>
  );
}