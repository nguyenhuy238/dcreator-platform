"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";
import { AccountPasswordResetCard } from "@/app/dashboard/_components/AccountPasswordResetCard";
import { useCurrentBrand } from "@/app/dashboard/brand/_hooks/use-brand-context";
import { resolveImageUrl } from "@/lib/images/resolve-image-url";

type BrandProfile = {
  brandName: string;
  contactName: string;
  contactEmail: string;
  logoUrl: string;
  businessInfo: string;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

const defaultForm: BrandProfile = {
  brandName: "",
  contactName: "",
  contactEmail: "",
  logoUrl: "",
  businessInfo: "",
  verificationStatus: "UNVERIFIED"
};

function statusLabel(status: BrandProfile["verificationStatus"]) {
  if (status === "VERIFIED") return "Đã xác minh";
  if (status === "PENDING") return "Đang chờ duyệt";
  if (status === "REJECTED") return "Bị từ chối";
  return "Chưa xác minh";
}

export default function BrandProfilePage() {
  const { currentBrandId } = useCurrentBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [form, setForm] = useState<BrandProfile>(defaultForm);
  const previewLogoSrc = useMemo(() => resolveImageUrl(form.logoUrl, ""), [form.logoUrl]);
  const profileApiPath = useMemo(() => {
    if (!currentBrandId) return "/api/brand/dashboard/profile";
    return `/api/brand/dashboard/profile?brandId=${encodeURIComponent(currentBrandId)}`;
  }, [currentBrandId]);

  function normalizeLogoUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("/uploads/")) return trimmed;
    return `https://${trimmed}`;
  }

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(profileApiPath, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<BrandProfile>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể tải hồ sơ Brand" : payload.error);
      }
      setForm({ ...defaultForm, ...payload.data });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải hồ sơ Brand");
    } finally {
      setLoading(false);
    }
  }, [profileApiPath]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    setLogoLoadError(false);
  }, [form.logoUrl]);

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payloadBody: BrandProfile = {
        ...form,
        logoUrl: normalizeLogoUrl(form.logoUrl)
      };
      const response = await fetch(profileApiPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });
      const payload = (await response.json()) as ApiResponse<BrandProfile>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Cập nhật hồ sơ Brand thất bại" : payload.error);
      }
      setForm({ ...defaultForm, ...payload.data });
      setSuccess("Đã cập nhật hồ sơ Brand.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Cập nhật hồ sơ Brand thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch("/api/uploads/brand-logo", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as ApiResponse<{ logoUrl: string }>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể tải logo lên" : payload.error);
      }
      setForm((current) => ({ ...current, logoUrl: payload.data.logoUrl }));
      setLogoLoadError(false);
      setSuccess("Đã tải logo lên. Nhấn 'Lưu hồ sơ Brand' để cập nhật chính thức.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Tải logo thất bại");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }

  return (
    <>
      
      <>
        <Link href="/dashboard/brand/settings" className="mb-4 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900">
          <span aria-hidden="true">←</span>
          Quay lại
        </Link>
        <PageHeader title="Hồ sơ Brand" subtitle="Quản lý thông tin hiển thị và trạng thái xác minh của Brand." />
        {error ? <ErrorState title="Không thể tải hồ sơ" description={error} onRetry={() => void loadProfile()} /> : null}
        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : !form.brandName && !error ? (
          <EmptyState title="Chưa có hồ sơ Brand" description="Nhập thông tin Brand để hoàn tất hồ sơ." />
        ) : null}

        {!loading ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <form className="dc-card grid gap-4 p-5" onSubmit={submitProfile}>
              <SectionHeader title="Thông tin Brand" />
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                Tên Brand
                <input
                  className="dc-input"
                  value={form.brandName}
                  onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                Tên liên hệ
                <input
                  className="dc-input"
                  value={form.contactName}
                  onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                Email liên hệ
                <input
                  className="dc-input"
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                  placeholder="brand@example.com"
                  required
                />
              </label>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-zinc-700">Logo Brand</label>
                <input className="dc-input bg-white" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} disabled={uploadingLogo} />
                {uploadingLogo ? <p className="text-sm text-zinc-500">Đang tải logo lên...</p> : null}
                <input
                  className="dc-input"
                  type="text"
                  value={form.logoUrl}
                  onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
                  placeholder="https://... hoặc URL sau khi upload"
                />
              </div>
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                Thông tin kinh doanh
                <textarea
                  className="dc-input min-h-32"
                  value={form.businessInfo}
                  onChange={(event) => setForm((current) => ({ ...current, businessInfo: event.target.value }))}
                  placeholder="Ngành hàng, sản phẩm, mục tiêu campaign..."
                />
              </label>
              <button className="dc-btn-primary w-fit" type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu hồ sơ Brand"}
              </button>
            </form>

            <aside className="grid h-fit gap-4">
              <div className="dc-card p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Xem trước</p>
              <div className="mt-4 flex items-center gap-3">
                {previewLogoSrc && !logoLoadError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewLogoSrc}
                    alt={form.brandName || "Logo Brand"}
                    className="h-14 w-14 rounded-2xl border border-zinc-200 bg-zinc-100 object-cover"
                    onError={() => setLogoLoadError(true)}
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-black text-white">
                    {(form.brandName || "B").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-zinc-900">{form.brandName || "Tên Brand"}</p>
                  <p className="text-sm text-zinc-600">{form.contactName || "Tên liên hệ"}</p>
                  <p className="text-sm text-zinc-500">{form.contactEmail || "Email liên hệ"}</p>
                  <p className="text-sm text-zinc-500">{statusLabel(form.verificationStatus)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-600">{form.businessInfo || "Chưa có thông tin Brand."}</p>
              </div>
              <AccountPasswordResetCard />
            </aside>
          </section>
        ) : null}
      </>
    </>
  );
}

