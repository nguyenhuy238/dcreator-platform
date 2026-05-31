"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";
import { PasswordInput } from "@/app/components/dcreator/ui/PasswordInput";
import { canAccessPath, resolveWorkspaceLanding } from "@/lib/auth/workspace-choice";

type LoginContext = { creatorProfile?: { id: string } | null; brandMemberships?: Array<{ id: string; name: string; role: "OWNER" | "MANAGER" | "STAFF" }> };

async function resolvePostLoginPath(roles: Role[], context?: LoginContext) {
  const decision = resolveWorkspaceLanding({
    roles,
    creatorProfile: context?.creatorProfile ?? null,
    brandMemberships: context?.brandMemberships ?? []
  });
  return decision.href;
}

async function resolveTargetPath(roles: Role[], nextPath: string | null, context?: LoginContext) {
  const defaultPath = await resolvePostLoginPath(roles, context);
  if (!nextPath) return defaultPath;
  if (!canAccessPath(nextPath, { roles, creatorProfile: context?.creatorProfile ?? null, brandMemberships: context?.brandMemberships ?? [] })) return defaultPath;
  return nextPath;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    let alive = true;
    async function checkAuth() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = await response.json();
      if (!alive) return;
      if (response.ok && payload?.success && payload?.data?.user?.roles) {
        const roles = payload.data.user.roles as Role[];
        router.replace(await resolveTargetPath(roles, null, {
          creatorProfile: payload.data.user.creatorProfile ?? null,
          brandMemberships: payload.data.user.brandMemberships ?? []
        }));
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
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const nextFieldErrors: { email?: string; password?: string } = {};
    if (!email.includes("@")) nextFieldErrors.email = "Email không hợp lệ.";
    if (password.length < 8) nextFieldErrors.password = "Mật khẩu cần tối thiểu 8 ký tự.";
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setLoading(false);
      return;
    }
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok || !payload.success) return setError(payload.error ?? "Đăng nhập thất bại");
    const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
    const mePayload = await meResponse.json();
    const roles = (mePayload?.data?.user?.roles ?? payload?.data?.roles ?? [payload?.data?.role].filter(Boolean)) as Role[];
    const target = await resolveTargetPath(roles, searchParams.get("next"), {
      creatorProfile: mePayload?.data?.user?.creatorProfile ?? null,
      brandMemberships: mePayload?.data?.user?.brandMemberships ?? []
    });
    router.push(target);
    router.refresh();
  }

  return (
    <>
      <PublicHeader />
      <main className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl items-center px-4 py-8 md:grid-cols-2 md:px-6">
        <section className="hidden rounded-[28px] border border-zinc-200 bg-white/90 p-8 shadow-[0_30px_90px_-50px_rgba(24,24,27,0.45)] backdrop-blur md:block">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">dCreator</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Kết nối ảnh hưởng, mở rộng doanh thu.</h1>
          <p className="mt-3 text-zinc-600">
            Đăng nhập tài khoản cơ bản, sau đó tạo Creator Profile hoặc Brand và dùng dashboard ngay.
          </p>
        </section>
        <form className="mx-auto w-full max-w-md space-y-4 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_40px_120px_-60px_rgba(24,24,27,0.55)]" onSubmit={onSubmit}>
          <h2 className="text-2xl font-black">Đăng nhập</h2>
          <FormField label="Email" error={fieldErrors.email}>
            <input name="email" type="email" className="dc-input" placeholder="example@email.com" required />
          </FormField>
          <FormField label="Mật khẩu" error={fieldErrors.password}>
            <PasswordInput name="password" className={fieldErrors.password ? "border-red-500 ring-1 ring-red-300" : ""} placeholder="Nhập mật khẩu của bạn" required minLength={8} />
          </FormField>
          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">Quên mật khẩu?</Link>
          </div>
          {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button className="dc-btn-primary w-full" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
          <p className="text-sm text-zinc-600">
            Chưa có tài khoản? <Link href="/auth/register" className="font-semibold text-zinc-900">Đăng ký</Link>
          </p>
        </form>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<><PublicHeader /><main className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6"><div className="h-80 animate-pulse rounded-[28px] bg-zinc-100" /></main></>}>
      <LoginPageContent />
    </Suspense>
  );
}
