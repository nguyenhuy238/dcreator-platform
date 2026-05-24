﻿"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ActionToast, EmptyState, ErrorState, FormField, LoadingSkeleton, PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

type SocialLink = { label: string; url: string };
type CreatorProfile = {
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  categories: string[];
  socialLinks: SocialLink[];
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

type AvatarUploadResponse = { avatarUrl: string };

const categoryOptions = ["Lifestyle", "Food", "Beauty", "Tech", "Education", "Gaming", "Affiliate", "UGC"];

export default function CreatorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  const bioCount = useMemo(() => bio.trim().length, [bio]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/profile", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<CreatorProfile>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải hồ sơ Creator");
      }
      setDisplayName(payload.data.displayName ?? "");
      setAvatarUrl(payload.data.avatarUrl ?? "");
      setBio(payload.data.bio ?? "");
      setCategories(payload.data.categories ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải hồ sơ Creator");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function toggleCategory(category: string) {
    setCategories((current) => {
      if (current.includes(category)) return current.filter((item) => item !== category);
      if (current.length >= 8) return current;
      return [...current, category];
    });
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setAvatarFileName(file.name);
    setUploadingAvatar(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/uploads/creator-avatar", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as ApiResponse<AvatarUploadResponse>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải ảnh đại diện lên");
      }

      setAvatarUrl(payload.data.avatarUrl);
      setToast("Đã tải ảnh đại diện thành công.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ảnh đại diện lên");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          avatarUrl: avatarUrl.trim(),
          bio: bio.trim(),
          categories
        })
      });
      const payload = (await response.json()) as ApiResponse<CreatorProfile>;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể lưu hồ sơ Creator");
      }
      setToast("Đã cập nhật hồ sơ Creator.");
      setTimeout(() => setToast(""), 2200);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể lưu hồ sơ Creator");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Hồ sơ Creator" subtitle="Quản lý thông tin cá nhân và lĩnh vực nội dung." />

      {error ? <ErrorState title="Không thể xử lý hồ sơ" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading ? (
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <form className="dc-card grid gap-4 p-5" onSubmit={submit}>
            <SectionHeader title="Thông tin Creator" />

            <FormField label="Tên hiển thị">
              <input className="dc-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </FormField>

            <FormField label="Ảnh đại diện">
              <div className="grid gap-2">
                <input className="dc-input" type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} />
                <p className="text-xs text-zinc-500">
                  {uploadingAvatar ? "Đang tải ảnh đại diện..." : avatarFileName ? `Đã chọn: ${avatarFileName}` : "Chọn ảnh JPG/PNG/WebP, tối đa 5MB"}
                </p>
              </div>
            </FormField>

            <FormField label={`Bio (${bioCount}/1000)`}>
              <textarea className="dc-input min-h-28" maxLength={1000} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Mô tả ngắn về phong cách nội dung, thế mạnh và tệp audience..." />
            </FormField>

            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-700">Lĩnh vực nội dung</p>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((category) => (
                  <button
                    type="button"
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={categories.includes(category) ? "rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-semibold text-white" : "rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {categories.length === 0 ? <p className="mt-1 text-xs text-zinc-500">Chọn ít nhất 1 niche để nhận đề xuất campaign phù hợp.</p> : null}
            </div>

            <button type="submit" className="dc-btn-primary w-fit" disabled={saving || uploadingAvatar}>
              {saving ? "Đang lưu..." : "Lưu hồ sơ Creator"}
            </button>
          </form>

          <aside className="dc-card h-fit p-5">
            <SectionHeader title="Xem trước hồ sơ" />
            {!displayName && !bio ? (
              <EmptyState title="Hồ sơ còn trống" description="Hãy cập nhật thông tin để Brand dễ đánh giá và mời bạn vào campaign." />
            ) : (
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <div className="h-14 w-14 rounded-2xl border border-zinc-200 bg-cover bg-center" style={{ backgroundImage: `url(${avatarUrl})` }} />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-black text-white">{displayName.slice(0, 1).toUpperCase() || "C"}</div>
                  )}
                  <div>
                    <p className="font-bold text-zinc-900">{displayName || "Tên Creator"}</p>
                    <p className="text-sm text-zinc-600">{categories.join(", ") || "Chưa chọn lĩnh vực"}</p>
                  </div>
                </div>
                <p className="text-sm text-zinc-600">{bio || "Chưa có bio"}</p>
              </div>
            )}
          </aside>
        </section>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}