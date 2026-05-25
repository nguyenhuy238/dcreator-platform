"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";
import { getCampaignTypeLabel } from "@/lib/constants/campaign-type";

type CampaignCategory = "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
type CampaignType = "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
type SetupSource = "JOIN_EXISTING_DCREATOR_CAMP" | "BRAND_REQUESTED";
type BrandOption = { id: string; displayName: string; email: string };

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
  startsAt: string;
  endsAt: string;
  publishNow: boolean;
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

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
  startsAt: "",
  endsAt: "",
  publishNow: false
};

function toDateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export default function AdminCreateCampaignPage() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);

  const publicPathPreview = useMemo(() => `https://dcreator-platform.vercel.app/${form.slug || "..."}`, [form.slug]);

  function setField<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function setRoadmapStep(index: number, value: string) {
    setForm((current) => ({
      ...current,
      participationRoadmap: current.participationRoadmap.map((item, idx) => (idx === index ? value : item))
    }));
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

  async function searchBrand(keyword: string) {
    const nextKeyword = keyword.trim();
    setField("brandKeyword", keyword);
    if (nextKeyword.length < 1) {
      setBrandOptions([]);
      return;
    }
    const response = await fetch(`/api/admin/brand-accounts?query=${encodeURIComponent(nextKeyword)}`, { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<BrandOption[]>;
    if (!response.ok || !payload.success) return;
    setBrandOptions(payload.data);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("logo", file);
      const response = await fetch("/api/uploads/brand-logo", { method: "POST", body: formData });
      const payload = (await response.json()) as ApiResponse<{ logoUrl: string }>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Upload ảnh thất bại." : payload.error);
      setField("imageUrl", payload.data.logoUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startsAt: toDateTime(form.startsAt),
          endsAt: toDateTime(form.endsAt),
          participationRoadmap: form.participationRoadmap.filter((item) => item.trim().length > 0)
        })
      });
      const payload = (await response.json()) as ApiResponse<{ id: string; title: string }>;
      if (!response.ok || !payload.success) throw new Error(payload.success ? "Không thể tạo campaign" : payload.error);
      setSuccess(`Đã tạo campaign: ${payload.data.title}`);
      setForm(defaultForm);
      setBrandOptions([]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Tạo campaign (Admin)"
        subtitle="Admin có thể tạo campaign trực tiếp theo cấu trúc mới."
        action={<Link href="/admin/campaigns" className="dc-btn-secondary">Quay lại duyệt campaign</Link>}
      />

      {error ? <div className="mt-4"><ErrorState title="Tạo campaign thất bại" description={error} /></div> : null}
      {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <form className="dc-card mt-6 grid gap-4 p-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Brand Account ID</span>
            <input className="dc-input" value={form.brandKeyword} onChange={(event) => void searchBrand(event.target.value)} placeholder="Nhập tên brand để tìm" required />
            {brandOptions.length > 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-2">
                {brandOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`mb-1 block w-full rounded-lg px-2 py-1 text-left text-sm ${form.brandAccountId === option.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"}`}
                    onClick={() => {
                      setField("brandAccountId", option.id);
                      setField("brandKeyword", `${option.displayName} (${option.email})`);
                    }}
                  >
                    {option.displayName} - {option.email}
                  </button>
                ))}
              </div>
            ) : null}
            <span className="text-xs font-medium text-zinc-500">ID đã chọn: {form.brandAccountId || "Chưa chọn"}</span>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Đường dẫn công khai</span>
            <div className="flex overflow-hidden rounded-xl border border-zinc-200">
              <span className="bg-zinc-100 px-3 py-2 text-xs text-zinc-600">https://dcreator-platform.vercel.app/</span>
              <input className="min-w-0 flex-1 px-3 py-2 text-sm outline-none" value={form.slug} onChange={(event) => setField("slug", event.target.value)} placeholder="ten-campaign-cong-khai" required />
            </div>
            <span className="text-xs font-medium text-zinc-500">Preview: {publicPathPreview}</span>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Tên campaign</span>
            <input className="dc-input" value={form.title} onChange={(event) => setField("title", event.target.value)} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Brief</span>
            <textarea className="dc-input min-h-28" value={form.brief} onChange={(event) => setField("brief", event.target.value)} required />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Category</span>
            <select className="dc-input" value={form.category} onChange={(event) => setField("category", event.target.value as CampaignCategory)}>
              <option value="LIFESTYLE">LIFESTYLE</option>
              <option value="FOOD">FOOD</option>
              <option value="BEAUTY">BEAUTY</option>
              <option value="FASHION">FASHION</option>
              <option value="TECH">TECH</option>
              <option value="EDUCATION">EDUCATION</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Campaign type</span>
            <select className="dc-input" value={form.campaignType} onChange={(event) => setField("campaignType", event.target.value as CampaignType)}>
              <option value="COMMUNITY">{getCampaignTypeLabel()}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Setup source</span>
            <select className="dc-input" value={form.setupSource} onChange={(event) => setField("setupSource", event.target.value as SetupSource)}>
              <option value="BRAND_REQUESTED">BRAND_REQUESTED</option>
              <option value="JOIN_EXISTING_DCREATOR_CAMP">JOIN_EXISTING_DCREATOR_CAMP</option>
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
          </div>

          <label className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Quyền lợi</span>
            <textarea className="dc-input min-h-24" value={form.benefits} onChange={(event) => setField("benefits", event.target.value)} required />
          </label>

          <div className="grid gap-2 text-sm font-semibold text-zinc-700 md:col-span-2">
            <span>Ảnh</span>
            <input className="dc-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />
            <input className="dc-input" value={form.imageUrl} onChange={(event) => setField("imageUrl", event.target.value)} placeholder="/uploads/... hoặc https://..." />
            {uploading ? <span className="text-xs text-zinc-500">Đang tải ảnh...</span> : null}
            {form.imageUrl ? <img src={form.imageUrl} alt="Campaign cover" className="h-32 w-full rounded-xl border border-zinc-200 object-cover md:h-44" /> : null}
          </div>

          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Starts at</span>
            <input className="dc-input" type="datetime-local" value={form.startsAt} onChange={(event) => setField("startsAt", event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-zinc-700">
            <span>Ends at</span>
            <input className="dc-input" type="datetime-local" value={form.endsAt} onChange={(event) => setField("endsAt", event.target.value)} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            checked={form.publishNow}
            onChange={(event) => setField("publishNow", event.target.checked)}
          />
          Publish ngay sau khi tạo (ACTIVE)
        </label>

        <div className="flex justify-end">
          <button className="dc-btn-primary" type="submit" disabled={saving || uploading}>
            {saving ? "Đang tạo..." : "Tạo campaign"}
          </button>
        </div>
      </form>
    </>
  );
}

