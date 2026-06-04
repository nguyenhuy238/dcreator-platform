"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/app/components/dcreator/layout/shell";
import { PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";
import { EmbeddedRoleUpgradePanels } from "../_components/EmbeddedRoleUpgradePanels";
import { UserAccountInfoCard, type UserAccountInfo } from "../_components/user-account-info-card";

export default function UserSettingsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notifyReviewStatusEmail, setNotifyReviewStatusEmail] = useState(true);
  const [notifyVoucherMissionEmail, setNotifyVoucherMissionEmail] = useState(true);
  const [account, setAccount] = useState<UserAccountInfo | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/me/settings", { cache: "no-store" }),
      fetch("/api/profile/role-upgrade", { cache: "no-store" })
    ])
      .then(async ([settingsRes, profileRes]) => {
        const settingsPayload = await settingsRes.json();
        const profilePayload = await profileRes.json();
        if (!settingsRes.ok || !settingsPayload.success) throw new Error(settingsPayload.error ?? "Không thể tải cài đặt.");
        if (!profileRes.ok || !profilePayload.success) throw new Error(profilePayload.error ?? "Không thể tải thông tin cá nhân.");
        setNotifyReviewStatusEmail(Boolean(settingsPayload.data.notifyReviewStatusEmail));
        setNotifyVoucherMissionEmail(Boolean(settingsPayload.data.notifyVoucherMissionEmail));
        setAccount(profilePayload.data.account as UserAccountInfo);
      })
      .catch((fetchError: Error) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
          notifyReviewStatusEmail,
          notifyVoucherMissionEmail
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Lưu cài đặt thất bại.");
      setMessage(payload.data?.message ?? "Đã lưu cài đặt tài khoản.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Lưu cài đặt thất bại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppShell>
        <PageHeader title="Cài đặt tài khoản" subtitle="Thông tin cá nhân, bảo mật, thông báo và phiên đăng nhập." />
        {loading ? <div className="h-48 animate-pulse rounded-3xl bg-zinc-100" /> : null}
        {!loading ? (
          <>
            {account ? <UserAccountInfoCard account={account} onAccountUpdate={setAccount} onError={setError} onSuccess={setMessage} /> : null}
            <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSave}>
              <article className="dc-card p-5">
                <SectionHeader title="Bảo mật" />
                <p className="text-sm text-zinc-600">Đổi mật khẩu bằng cách nhập mật khẩu hiện tại và mật khẩu mới.</p>
                <div className="mt-3 grid gap-2">
                  <input className="dc-input" placeholder="Mật khẩu hiện tại" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                  <input className="dc-input" placeholder="Mật khẩu mới" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                </div>
              </article>
              <article className="dc-card p-5">
                <SectionHeader title="Thông báo" />
                <div className="mt-2 grid gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={notifyReviewStatusEmail} onChange={(event) => setNotifyReviewStatusEmail(event.target.checked)} />
                    Email về trạng thái duyệt
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={notifyVoucherMissionEmail} onChange={(event) => setNotifyVoucherMissionEmail(event.target.checked)} />
                    Email về voucher/mission
                  </label>
                </div>
              </article>
              <div className="md:col-span-2">
                <button type="submit" className="dc-btn-secondary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu cài đặt"}</button>
              </div>
            </form>
          </>
        ) : null}
        <section className="mt-4">
          <article className="dc-card p-5">
            <SectionHeader title="Phiên đăng nhập" />
            <p className="text-sm text-zinc-600">Đăng xuất khỏi phiên hiện tại.</p>
            <button type="button" className="dc-btn-primary mt-3" onClick={logout}>Đăng xuất</button>
          </article>
        </section>
        <section className="mt-4">
          <EmbeddedRoleUpgradePanels targets={["creator", "brand"]} message={searchParams.get("message")} />
        </section>
        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      </AppShell>
    </>
  );
}
