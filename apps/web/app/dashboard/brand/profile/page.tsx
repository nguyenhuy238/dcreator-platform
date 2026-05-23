"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

const nav = [
  { href: "/dashboard/brand", label: "Brand Dashboard" },
  { href: "/dashboard/brand/profile", label: "Brand Profile" },
  { href: "/brand", label: "Chiến dịch" },
  { href: "/brand/proofs", label: "Duyệt proof" },
  { href: "/wallet", label: "Quỹ" }
];

type BrandProfile = {
  brandName: string;
  logoUrl: string;
  businessInfo: string;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

const defaultForm: BrandProfile = {
  brandName: "",
  logoUrl: "",
  businessInfo: "",
  verificationStatus: "UNVERIFIED"
};

function statusLabel(status: BrandProfile["verificationStatus"]) {
  if (status === "VERIFIED") return "Da xac minh";
  if (status === "PENDING") return "Dang cho duyet";
  if (status === "REJECTED") return "Bi tu choi";
  return "Chua xac minh";
}

export default function BrandProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<BrandProfile>(defaultForm);

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/brand/dashboard/profile", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<BrandProfile>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Khong the tai Brand Profile" : payload.error);
      }
      setForm({ ...defaultForm, ...payload.data });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Khong the tai Brand Profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/brand/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = (await response.json()) as ApiResponse<BrandProfile>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Cap nhat Brand Profile that bai" : payload.error);
      }
      setForm({ ...defaultForm, ...payload.data });
      setSuccess("Da cap nhat Brand Profile.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Cap nhat Brand Profile that bai");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader title="Brand Profile" subtitle="Quan ly thong tin hien thi va trang thai xac minh cua Brand." />
        {error ? <ErrorState title="Khong the tai profile" description={error} onRetry={() => void loadProfile()} /> : null}
        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : !form.brandName && !error ? (
          <EmptyState title="Chua co Brand Profile" description="Nhap thong tin Brand de hoan tat ho so." />
        ) : null}

        {!loading ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <form className="dc-card grid gap-4 p-5" onSubmit={submitProfile}>
              <SectionHeader title="Thong tin Brand" />
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                Brand name
                <input
                  className="dc-input"
                  value={form.brandName}
                  onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                Logo URL
                <input
                  className="dc-input"
                  type="url"
                  value={form.logoUrl}
                  onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-700">
                Business info
                <textarea
                  className="dc-input min-h-32"
                  value={form.businessInfo}
                  onChange={(event) => setForm((current) => ({ ...current, businessInfo: event.target.value }))}
                  placeholder="Nganh hang, san pham, muc tieu campaign..."
                />
              </label>
              <button className="dc-btn-primary w-fit" type="submit" disabled={saving}>
                {saving ? "Dang luu..." : "Luu Brand Profile"}
              </button>
            </form>

            <aside className="dc-card h-fit p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Preview</p>
              <div className="mt-4 flex items-center gap-3">
                {form.logoUrl ? (
                  <div
                    aria-label={form.brandName || "Brand logo"}
                    className="h-14 w-14 rounded-2xl border border-zinc-200 bg-zinc-100 bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url(${form.logoUrl})` }}
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-black text-white">
                    {(form.brandName || "B").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-zinc-900">{form.brandName || "Brand name"}</p>
                  <p className="text-sm text-zinc-500">{statusLabel(form.verificationStatus)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-600">{form.businessInfo || "Chua co thong tin Brand."}</p>
            </aside>
          </section>
        ) : null}
      </AppShell>
    </>
  );
}
