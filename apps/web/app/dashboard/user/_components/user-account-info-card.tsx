"use client";

import { useState } from "react";

export type UserAccountInfo = {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  profile: { phone: string | null } | null;
};

export function UserAccountInfoCard({
  account,
  onAccountUpdate,
  onError,
  onSuccess
}: {
  account: UserAccountInfo;
  onAccountUpdate: (account: UserAccountInfo) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const displayName = account.displayName?.trim() || "User Demo";
  const email = account.email?.trim() || "user@dcreator.local";
  const phone = account.profile?.phone?.trim() || "Chưa có";

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    onError("");
    onSuccess("");
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const uploadRes = await fetch("/api/uploads/avatar", { method: "POST", body: formData });
      const uploadPayload = await uploadRes.json();
      if (!uploadRes.ok || !uploadPayload.success || !uploadPayload.data?.avatarUrl) {
        throw new Error(uploadPayload.error ?? "Không thể tải ảnh đại diện");
      }

      const patchRes = await fetch("/api/profile/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploadPayload.data.avatarUrl })
      });
      const patchPayload = await patchRes.json();
      if (!patchRes.ok || !patchPayload.success) {
        throw new Error(patchPayload.error ?? "Không thể cập nhật ảnh đại diện");
      }

      onAccountUpdate({ ...account, avatarUrl: patchPayload.data.avatarUrl });
      onSuccess("Đã cập nhật ảnh đại diện.");
    } catch (requestError) {
      onError(requestError instanceof Error ? requestError.message : "Không thể tải ảnh đại diện");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <article className="dc-card p-5 md:p-6">
      <h2 className="text-xl font-bold">Thông tin cá nhân</h2>
      <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
        <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center md:flex-col md:items-start">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-bold text-white shadow-sm">
            {displayName.slice(0, 1).toUpperCase() || "U"}
          </div>
          <label className="dc-btn-secondary cursor-pointer">
            {uploadingAvatar ? "Đang tải..." : "Tải ảnh đại diện"}
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
          <p className="text-sm">Số điện thoại: <span className="font-semibold">{phone}</span></p>
          <p className="text-sm">Trạng thái: <span className="font-semibold">User</span></p>
        </div>
      </div>
    </article>
  );
}
