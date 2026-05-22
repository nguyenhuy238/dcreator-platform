"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-access";
import type { Role } from "@prisma/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function checkAuth() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json();
      if (!alive) return;
      if (response.ok && payload?.success && payload?.data?.user?.roles) {
        const roles = payload.data.user.roles as Role[];
        router.replace(getDefaultDashboardPath(roles));
      }
    }
    void checkAuth();
    return () => {
      alive = false;
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }) });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok || !payload.success) return setError(payload.error ?? "Đăng nhập thất bại");
    const roles = (payload?.data?.roles ?? [payload?.data?.role].filter(Boolean)) as Role[];
    router.push(searchParams.get("next") ?? getDefaultDashboardPath(roles));
    router.refresh();
  }

  return <><PublicHeader /><main className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl items-center px-4 py-8 md:grid-cols-2 md:px-6"><section className="hidden rounded-3xl border border-zinc-200 bg-white p-8 md:block"><p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">dCreator</p><h1 className="mt-3 text-4xl font-black tracking-tight">Kết nối ảnh hưởng, mở rộng doanh thu.</h1><p className="mt-3 text-zinc-600">Đăng nhập tài khoản cơ bản, sau đó nâng cấp Creator/Brand tại User profile để gửi hồ sơ duyệt.</p></section><form className="dc-card mx-auto w-full max-w-md space-y-4 p-6" onSubmit={onSubmit}><h2 className="text-2xl font-black">Đăng nhập</h2><FormField label="Email" error=""><input name="email" type="email" className="dc-input" placeholder="example@email.com" required /></FormField><FormField label="Mật khẩu" error=""><input name="password" type="password" className="dc-input" placeholder="Nhập mật khẩu của bạn" required minLength={8} /></FormField>{error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}<button className="dc-btn-primary w-full" disabled={loading}>{loading ? "Đang xử lý..." : "Đăng nhập"}</button><p className="text-sm text-zinc-600">Chưa có tài khoản? <Link href="/auth/register" className="font-semibold text-zinc-900">Đăng ký</Link></p></form></main></>;
}
