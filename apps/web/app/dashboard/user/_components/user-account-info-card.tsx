"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { resolveImageUrl } from "@/lib/images/resolve-image-url";

export type UserAccountInfo = {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  profile: { phone: string | null } | null;
};

export type UserSettingsFeedback = {
  tone: "success" | "error" | "info" | "warning" | "loading";
  title: string;
  description: string;
};

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string; details?: unknown };

function normalizePhoneInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidVietnamPhone(value: string) {
  if (!/^\+?[0-9\s]+$/.test(value)) return false;
  const normalized = value.replace(/\s+/g, "");
  return /^0\d{9,10}$/.test(normalized) || /^\+84\d{9,10}$/.test(normalized);
}

function extractApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = "error" in payload && typeof payload.error === "string" ? payload.error : "";
  const details = "details" in payload ? payload.details : null;
  if (details && typeof details === "object" && "fieldErrors" in details) {
    const fieldErrors = details.fieldErrors as Record<string, string[] | undefined>;
    const firstFieldError = Object.values(fieldErrors).flat().find(Boolean);
    if (firstFieldError) return firstFieldError;
  }
  return error || fallback;
}

export function UserAccountInfoCard({
  account,
  onAccountUpdate,
  onFeedback
}: {
  account: UserAccountInfo;
  onAccountUpdate: (account: UserAccountInfo) => void;
  onFeedback: (feedback: UserSettingsFeedback) => void;
}) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(account.profile?.phone ?? "");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const displayName = account.displayName?.trim() || "User Demo";
  const email = account.email?.trim() || "user@dcreator.local";
  const currentPhone = account.profile?.phone?.trim() ?? "";
  const phone = currentPhone || "Chưa có";
  const normalizedPhone = useMemo(() => normalizePhoneInput(phoneInput), [phoneInput]);
  const phoneChanged = normalizedPhone !== currentPhone;
  const phoneError = phoneTouched && normalizedPhone && !isValidVietnamPhone(normalizedPhone) ? "Số điện thoại không hợp lệ." : "";
  const avatarSrc = resolveImageUrl(account.avatarUrl, "");

  useEffect(() => {
    setPhoneInput(account.profile?.phone ?? "");
    setPhoneTouched(false);
  }, [account.profile?.phone]);

  async function uploadAvatar(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      onFeedback({
        tone: "error",
        title: "Ảnh không hợp lệ",
        description: "Vui lòng chọn file JPG, PNG hoặc WebP."
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onFeedback({
        tone: "error",
        title: "Ảnh không hợp lệ",
        description: "Ảnh đại diện vượt quá 5MB."
      });
      return;
    }

    setUploadingAvatar(true);
    onFeedback({
      tone: "loading",
      title: "Đang tải ảnh đại diện",
      description: "Vui lòng chờ trong giây lát."
    });
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const uploadRes = await fetch("/api/uploads/avatar", { method: "POST", body: formData });
      const uploadPayload = (await uploadRes.json()) as ApiResponse<{ avatarUrl: string }>;
      if (!uploadRes.ok || !uploadPayload.success || !uploadPayload.data?.avatarUrl) {
        throw new Error(extractApiError(uploadPayload, "Không thể tải ảnh đại diện. Vui lòng thử lại."));
      }

      const patchRes = await fetch("/api/profile/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploadPayload.data.avatarUrl })
      });
      const patchPayload = (await patchRes.json()) as ApiResponse<UserAccountInfo>;
      if (!patchRes.ok || !patchPayload.success) {
        throw new Error(extractApiError(patchPayload, "Không thể cập nhật ảnh đại diện. Vui lòng thử lại."));
      }

      const nextAccount = { ...account, avatarUrl: patchPayload.data.avatarUrl, profile: patchPayload.data.profile ?? account.profile };
      onAccountUpdate(nextAccount);
      window.dispatchEvent(new CustomEvent("dc:user-updated", { detail: { avatarUrl: nextAccount.avatarUrl } }));
      onFeedback({
        tone: "success",
        title: "Cập nhật ảnh đại diện thành công",
        description: "Ảnh đại diện của bạn đã được thay đổi."
      });
    } catch (requestError) {
      onFeedback({
        tone: "error",
        title: "Không thể cập nhật ảnh đại diện",
        description: requestError instanceof Error ? requestError.message : "Vui lòng thử lại."
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function updatePhone(event: FormEvent) {
    event.preventDefault();
    setPhoneTouched(true);
    if (!phoneChanged) {
      onFeedback({
        tone: "info",
        title: "Chưa có thay đổi",
        description: "Số điện thoại hiện tại chưa thay đổi."
      });
      return;
    }
    if (normalizedPhone && !isValidVietnamPhone(normalizedPhone)) return;

    setSavingPhone(true);
    onFeedback({
      tone: "loading",
      title: "Đang cập nhật số điện thoại",
      description: "Vui lòng chờ trong giây lát."
    });
    try {
      const patchRes = await fetch("/api/profile/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone })
      });
      const patchPayload = (await patchRes.json()) as ApiResponse<UserAccountInfo>;
      if (!patchRes.ok || !patchPayload.success) {
        throw new Error(extractApiError(patchPayload, "Không thể cập nhật số điện thoại. Vui lòng kiểm tra lại."));
      }

      const nextAccount = { ...account, avatarUrl: patchPayload.data.avatarUrl ?? account.avatarUrl, profile: { phone: patchPayload.data.profile?.phone ?? null } };
      onAccountUpdate(nextAccount);
      setPhoneDialogOpen(false);
      onFeedback({
        tone: "success",
        title: "Cập nhật số điện thoại thành công",
        description: nextAccount.profile?.phone ? `Số điện thoại mới: ${nextAccount.profile.phone}` : "Số điện thoại đã được xóa khỏi hồ sơ."
      });
    } catch (requestError) {
      onFeedback({
        tone: "error",
        title: "Không thể cập nhật số điện thoại",
        description: requestError instanceof Error ? requestError.message : "Vui lòng kiểm tra lại."
      });
    } finally {
      setSavingPhone(false);
    }
  }

  return (
    <article className="dc-card p-5 md:p-6">
      <h2 className="text-xl font-bold">Thông tin cá nhân</h2>
      <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
        <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center md:flex-col md:items-start">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc} alt={displayName} className="h-16 w-16 rounded-2xl border border-zinc-200 bg-zinc-100 object-cover shadow-sm" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-bold text-white shadow-sm">
              {displayName.slice(0, 1).toUpperCase() || "U"}
            </div>
          )}
          <label className={`dc-btn-secondary cursor-pointer ${uploadingAvatar ? "pointer-events-none opacity-60" : ""}`}>
            {uploadingAvatar ? "Đang tải lên..." : "Tải ảnh đại diện"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploadingAvatar}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file) void uploadAvatar(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="grid min-w-0 flex-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          <p className="text-sm">Tên hiển thị: <span className="font-semibold">{displayName}</span></p>
          <p className="text-sm">Email: <span className="break-all font-semibold">{email}</span></p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Số điện thoại: <span className="font-semibold">{phone}</span></span>
            <button
              type="button"
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              onClick={() => {
                setPhoneInput(account.profile?.phone ?? "");
                setPhoneTouched(false);
                setPhoneDialogOpen(true);
              }}
            >
              Cập nhật
            </button>
          </div>
          <p className="text-sm">Trạng thái: <span className="font-semibold">User</span></p>
        </div>
      </div>
      {phoneDialogOpen ? (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/45 p-4" onClick={() => !savingPhone && setPhoneDialogOpen(false)}>
          <form className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" onSubmit={updatePhone} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Cập nhật số điện thoại</h3>
                <p className="mt-1 text-sm text-zinc-600">Số điện thoại được dùng cho hồ sơ và liên hệ hỗ trợ khi cần.</p>
              </div>
              <button
                type="button"
                aria-label="Đóng popup"
                className="rounded-lg border border-zinc-200 px-2 py-1 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100"
                disabled={savingPhone}
                onClick={() => setPhoneDialogOpen(false)}
              >
                ×
              </button>
            </div>
            <label className="mt-4 grid gap-1.5 text-sm font-medium text-zinc-700">
              Số điện thoại
              <input
                className={`dc-input ${phoneError ? "border-red-300 bg-red-50" : ""}`}
                autoFocus
                inputMode="tel"
                placeholder="Nhập số điện thoại"
                value={phoneInput}
                disabled={savingPhone}
                onBlur={() => setPhoneTouched(true)}
                onChange={(event) => {
                  setPhoneInput(event.target.value);
                  setPhoneTouched(true);
                }}
              />
              {phoneError ? <span className="text-xs font-semibold text-red-600">{phoneError}</span> : <span className="text-xs text-zinc-500">Hỗ trợ số bắt đầu bằng 0 hoặc +84.</span>}
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="dc-btn-secondary" disabled={savingPhone} onClick={() => setPhoneDialogOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="dc-btn-primary" disabled={savingPhone || uploadingAvatar || !phoneChanged || Boolean(phoneError)}>
                {savingPhone ? "Đang lưu..." : "Cập nhật số điện thoại"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </article>
  );
}
