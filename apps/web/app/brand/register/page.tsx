"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { upsertCurrentBrandInContext } from "@/app/dashboard/brand/_hooks/use-brand-context";

type AuthState = { checked: boolean; loggedIn: boolean };

export default function BrandRegisterPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>({ checked: false, loggedIn: false });
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAuth() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const payload = await response.json();
        if (!active) return;
        setAuth({ checked: true, loggedIn: Boolean(response.ok && payload?.success && payload?.data?.user) });
      } catch {
        if (active) setAuth({ checked: true, loggedIn: false });
      }
    }
    void loadAuth();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/brand/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          industry,
          description,
          logoUrl
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Không thể tạo Brand.");
      }

      upsertCurrentBrandInContext({
        id: payload.data.id,
        name: payload.data.name,
        role: "OWNER"
      });
      setSuccess("Brand đã được tạo. Bạn có thể bắt đầu thiết lập sản phẩm/campaign.");
      router.push("/dashboard/brand?created=1");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể tạo Brand.");
    } finally {
      setLoading(false);
    }
  }

  if (!auth.checked) {
    return (
      <>
        <PublicHeader />
        <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
          <div className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
        </main>
      </>
    );
  }

  if (!auth.loggedIn) {
    return (
      <>
        <PublicHeader />
        <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h1 className="text-2xl font-black text-zinc-900">Tạo Brand mới</h1>
            <p className="mt-2 text-sm text-zinc-600">Bạn cần đăng nhập trước khi tạo Brand.</p>
            <Link href="/auth/login?next=/brand/register" className="dc-btn-primary mt-4 inline-flex">
              Đăng nhập để tạo Brand
            </Link>
          </section>
        </main>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Brand Creation</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-900">Tạo Brand mới</h1>
          <p className="mt-2 text-sm text-zinc-600">Tạo xong dùng ngay. Bạn có thể bổ sung thông tin xác minh và pháp lý sau.</p>
          <p className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Chưa xác minh: Xác minh giúp mở khóa payout/campaign nâng cao
          </p>

          <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-700">Tên Brand</span>
              <input
                className="dc-input"
                required
                minLength={2}
                value={brandName}
                onChange={(event) => setBrandName(event.target.value)}
                placeholder="Ví dụ: ABC Food"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-700">Ngành hàng</span>
              <input
                className="dc-input"
                required
                minLength={2}
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                placeholder="Ví dụ: F&B, Beauty, Lifestyle"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-700">Mô tả ngắn</span>
              <textarea
                className="dc-input min-h-24"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Mô tả ngắn về Brand (không bắt buộc)"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-700">Logo URL</span>
              <input
                className="dc-input"
                type="url"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://example.com/logo.png (không bắt buộc)"
              />
            </label>

            {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button className="dc-btn-primary" disabled={loading} type="submit">
                {loading ? "Đang tạo..." : "Tạo Brand"}
              </button>
              <Link href="/dashboard/brand" className="dc-btn-secondary">Vào Brand Dashboard</Link>
            </div>
          </form>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
