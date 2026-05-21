"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { FormField } from "@/app/components/dcreator/ui/base";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: formData.get("displayName"), email: formData.get("email"), password: formData.get("password") }) });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok || !payload.success) return setError(payload.error ?? "Đăng ký thất bại");
    router.push("/dashboard/user");
    router.refresh();
  }

  return <><PublicHeader /><main className="mx-auto w-full max-w-xl px-4 py-10 md:px-6"><form className="dc-card space-y-4 p-6" onSubmit={onSubmit}><h1 className="text-3xl font-black">Tạo tài khoản dCreator</h1><FormField label="Tên hiển thị"><input name="displayName" className="dc-input" required minLength={2} /></FormField><FormField label="Email"><input name="email" type="email" className="dc-input" required /></FormField><FormField label="Mật khẩu"><input name="password" type="password" className="dc-input" required minLength={8} /></FormField>{error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}<button className="dc-btn-primary" disabled={loading}>{loading ? "Đang tạo tài khoản..." : "Tham gia"}</button></form></main></>;
}
