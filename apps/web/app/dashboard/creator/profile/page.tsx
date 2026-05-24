"use client";

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

type SocialKey = "TikTok" | "Facebook" | "Instagram" | "YouTube" | "Portfolio";

const categoryOptions = ["Lifestyle", "Food", "Beauty", "Tech", "Education", "Gaming", "Affiliate", "UGC"];

function toSocialMap(items: SocialLink[]) {
  const map: Record<SocialKey, string> = {
    TikTok: "",
    Facebook: "",
    Instagram: "",
    YouTube: "",
    Portfolio: ""
  };
  for (const item of items) {
    const key = item.label as SocialKey;
    if (key in map) map[key] = item.url;
  }
  return map;
}

function fromSocialMap(map: Record<SocialKey, string>) {
  return (Object.entries(map) as Array<[SocialKey, string]>).filter(([, url]) => url.trim()).map(([label, url]) => ({ label, url: url.trim() }));
}

function normalizeAvatarUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${trimmed}`;
    }
    return trimmed;
  }
  return `https://${trimmed}`;
}

function resolveAvatarSrc(input: string) {
  const raw = input.trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${parsed.pathname}${parsed.search}`;
    }
    return raw;
  } catch {
    if (raw.startsWith("/")) return raw;
    return "";
  }
}

export default function CreatorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [socialMap, setSocialMap] = useState<Record<SocialKey, string>>({ TikTok: "", Facebook: "", Instagram: "", YouTube: "", Portfolio: "" });

  const bioCount = useMemo(() => bio.trim().length, [bio]);
  const previewAvatarSrc = useMemo(() => resolveAvatarSrc(avatarUrl), [avatarUrl]);

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
      setSocialMap(toSocialMap(payload.data.socialLinks ?? []));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải hồ sơ Creator");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarUrl]);

  function toggleCategory(category: string) {
    setCategories((current) => {
      if (current.includes(category)) return current.filter((item) => item !== category);
      if (current.length >= 8) return current;
      return [...current, category];
    });
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
          avatarUrl: normalizeAvatarUrl(avatarUrl),
          bio: bio.trim(),
          categories,
          socialLinks: fromSocialMap(socialMap)
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

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setUploadingAvatar(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/uploads/avatar", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as ApiResponse<{ avatarUrl: string }>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải ảnh đại diện");
      }
      setAvatarUrl(payload.data.avatarUrl);
      setAvatarLoadError(false);
      setToast("Đã tải ảnh đại diện. Nhấn lưu để cập nhật hồ sơ.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải ảnh đại diện");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  return (
    <>
      <PageHeader title="Hồ sơ Creator" subtitle="Quản lý thông tin cá nhân, lĩnh vực nội dung và các kênh mạng xã hội." />

      {error ? <ErrorState title="Không thể xử lý hồ sơ" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading ? (
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <form className="dc-card grid gap-4 p-5" onSubmit={submit}>
            <SectionHeader title="Thông tin Creator" />

            <FormField label="Tên hiển thị">
              <input className="dc-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </FormField>

            <div className="grid gap-2">
              <FormField label="Ảnh đại diện">
                <input className="dc-input bg-white" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </FormField>
              {uploadingAvatar ? <p className="text-sm text-zinc-500">Đang tải ảnh đại diện...</p> : null}
              <input className="dc-input" type="text" placeholder="https://... (hoặc URL sau khi upload)" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
            </div>

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

            <SectionHeader title="Social links & Portfolio" />
            {(Object.keys(socialMap) as SocialKey[]).map((key) => (
              <FormField key={key} label={key}>
                <input
                  className="dc-input"
                  type="url"
                  placeholder={key === "Portfolio" ? "https://portfolio..." : `https://${key.toLowerCase()}.com/...`}
                  value={socialMap[key]}
                  onChange={(event) => setSocialMap((current) => ({ ...current, [key]: event.target.value }))}
                />
              </FormField>
            ))}

            <button type="submit" className="dc-btn-primary w-fit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu hồ sơ Creator"}</button>
          </form>

          <aside className="dc-card h-fit p-5">
            <SectionHeader title="Xem trước hồ sơ" />
            {!displayName && !bio ? (
              <EmptyState title="Hồ sơ còn trống" description="Hãy cập nhật thông tin để Brand dễ đánh giá và mời bạn vào campaign." />
            ) : (
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  {previewAvatarSrc && !avatarLoadError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewAvatarSrc}
                      alt={displayName || "Creator avatar"}
                      className="h-14 w-14 rounded-2xl border border-zinc-200 object-cover"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-black text-white">{displayName.slice(0, 1).toUpperCase() || "C"}</div>
                  )}
                  <div>
                    <p className="font-bold text-zinc-900">{displayName || "Tên Creator"}</p>
                    <p className="text-sm text-zinc-600">{categories.join(", ") || "Chưa chọn lĩnh vực"}</p>
                  </div>
                </div>
                <p className="text-sm text-zinc-600">{bio || "Chưa có bio"}</p>
                <div className="grid gap-1 text-sm text-zinc-600">
                  {(Object.entries(socialMap) as Array<[SocialKey, string]>).map(([label, url]) => (
                    url.trim() ? <p key={label}><span className="font-semibold text-zinc-900">{label}:</span> {url}</p> : null
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
