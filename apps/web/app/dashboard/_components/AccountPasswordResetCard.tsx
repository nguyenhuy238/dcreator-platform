"use client";

import { FormEvent, useState } from "react";
import { SectionHeader } from "@/app/components/dcreator/ui/base";
import { PasswordInput } from "@/app/components/dcreator/ui/PasswordInput";

type ApiResponse = { success: true; data: { message?: string } } | { success: false; error?: string };

export function AccountPasswordResetCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (next !== confirm) {
      setError("Mật khẩu mới chưa khớp.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next })
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Không thể đổi mật khẩu." : payload.error ?? "Không thể đổi mật khẩu.");
      }

      setSuccess(payload.data.message ?? "Đã đổi mật khẩu thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể đổi mật khẩu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="dc-card grid gap-4 p-5" onSubmit={onSubmit}>
      <SectionHeader title="Bảo mật tài khoản" />
      <p className="text-sm text-zinc-600">
        Nếu bạn đăng nhập bằng mật khẩu tạm trong email, nhập mật khẩu tạm vào ô hiện tại rồi đặt mật khẩu mới.
      </p>
      <div className="grid gap-3">
        <PasswordInput placeholder="Mật khẩu hiện tại hoặc mật khẩu tạm" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required minLength={8} />
        <PasswordInput placeholder="Mật khẩu mới" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} />
        <PasswordInput placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />
      </div>
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      <button type="submit" className="dc-btn-secondary w-fit" disabled={saving}>
        {saving ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
