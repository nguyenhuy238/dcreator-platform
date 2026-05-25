"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ActionToast,
  EmptyState,
  ErrorState,
  FormField,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
  StatusBadge
} from "@/app/components/dcreator/ui/base";

type SocialLink = { label: string; url: string };
type CreatorProfile = {
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  categories: string[];
  socialLinks: SocialLink[];
};

type Channel = {
  id: string;
  platform: "TikTok" | "Instagram" | "YouTube" | "Facebook" | "Other";
  url: string;
  followerCount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason: string | null;
  createdAt: string;
};

type CreatorProfileSnapshot = {
  id: string;
  displayName: string;
  mainPlatform: "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "OTHER" | null;
  socialUrl: string | null;
  followerCount: number | null;
};

type ChannelsPayload = {
  creatorProfile: CreatorProfileSnapshot | null;
  channels: Channel[];
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };
type AvatarUploadResponse = { avatarUrl: string };

const categoryOptions = ["Lifestyle", "Food", "Beauty", "Tech", "Education", "Gaming", "Affiliate", "UGC"];
const emptyDraft = { platform: "TikTok" as const, url: "", followerCount: 0 };

function toPlatformBadge(platform: Channel["platform"]) {
  if (platform === "TikTok") return "TIKTOK";
  if (platform === "Instagram") return "INSTAGRAM";
  if (platform === "YouTube") return "YOUTUBE";
  if (platform === "Facebook") return "FACEBOOK";
  return "OTHER";
}

function onlyDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

function parseNonNegativeInt(raw: string) {
  const digits = onlyDigits(raw);
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

function formatIntForInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toLocaleString("vi-VN");
}

export default function CreatorProfilePage() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "channels" ? "channels" : "profile";

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

  const [channels, setChannels] = useState<Channel[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfileSnapshot | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  const bioCount = useMemo(() => bio.trim().length, [bio]);
  const canSubmitChannel = useMemo(() => draft.url.trim().length > 0, [draft.url]);

  async function loadProfile() {
    const response = await fetch("/api/creator/dashboard/profile", { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<CreatorProfile>;
    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? "Không thể tải hồ sơ Creator");
    }
    setDisplayName(payload.data.displayName ?? "");
    setAvatarUrl(payload.data.avatarUrl ?? "");
    setBio(payload.data.bio ?? "");
    setCategories(payload.data.categories ?? []);
  }

  async function loadChannels() {
    const response = await fetch("/api/creator/dashboard/channels", { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<ChannelsPayload>;
    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? "Không thể tải danh sách kênh");
    }
    setChannels(payload.data.channels ?? []);
    setCreatorProfile(payload.data.creatorProfile ?? null);
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadProfile(), loadChannels()]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu Creator");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
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

      const response = await fetch("/api/uploads/creator-avatar", { method: "POST", body: formData });
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

  async function submitProfile(event: FormEvent) {
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
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Không thể lưu hồ sơ Creator");
      setToast("Đã cập nhật hồ sơ Creator.");
      setTimeout(() => setToast(""), 2200);
      await loadProfile();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể lưu hồ sơ Creator");
    } finally {
      setSaving(false);
    }
  }

  async function addChannel() {
    if (!canSubmitChannel) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const payload = (await response.json()) as ApiResponse<ChannelsPayload>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể thêm kênh");
      setChannels(payload.data.channels);
      setCreatorProfile(payload.data.creatorProfile);
      setDraft(emptyDraft);
      setToast("Đã gửi yêu cầu thêm kênh để admin duyệt.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể thêm kênh");
    } finally {
      setSaving(false);
    }
  }

  async function removeChannel(linkId: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/creator/dashboard/channels/${linkId}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiResponse<ChannelsPayload>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể xóa kênh");
      setChannels(payload.data.channels);
      setCreatorProfile(payload.data.creatorProfile);
      setToast("Đã xóa kênh.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xóa kênh");
    } finally {
      setSaving(false);
    }
  }

  async function setMainChannel(linkId: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/creator/dashboard/channels/${linkId}/set-main`, { method: "POST" });
      const payload = (await response.json()) as ApiResponse<ChannelsPayload>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể cập nhật kênh chính");
      setChannels(payload.data.channels);
      setCreatorProfile(payload.data.creatorProfile);
      setToast("Đã cập nhật kênh chính.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật kênh chính");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Hồ sơ Creator" subtitle="Quản lý thông tin cá nhân, kênh xã hội và lĩnh vực nội dung." />

      <div className="mb-4 flex gap-2 border-b border-zinc-200 pb-2">
        <a href="?tab=profile" className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === "profile" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
          Thông tin cơ bản
        </a>
        <a href="?tab=channels" className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === "channels" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
          Kênh mạng xã hội
        </a>
      </div>

      {error ? <ErrorState title="Không thể xử lý hồ sơ" description={error} onRetry={() => void loadAll()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && activeTab === "profile" ? (
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <form className="dc-card grid gap-4 p-5" onSubmit={submitProfile}>
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
            </div>

            <button type="submit" className="dc-btn-primary w-fit" disabled={saving || uploadingAvatar}>
              {saving ? "Đang lưu..." : "Lưu hồ sơ Creator"}
            </button>
          </form>

          <aside className="dc-card h-fit p-5">
            <SectionHeader title="Xem trước hồ sơ" />
            {!displayName && !bio ? (
              <EmptyState title="Hồ sơ còn trống" description="Hãy cập nhật thông tin để Brand dễ đánh giá." />
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

      {!loading && activeTab === "channels" ? (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <article className="dc-card p-4">
            <SectionHeader title="Danh sách kênh" subtitle={`${channels.length} kênh`} />
            {channels.length === 0 ? (
              <EmptyState title="Chưa có kênh" description="Thêm ít nhất một kênh để gửi admin duyệt." />
            ) : (
              <div className="grid gap-3">
                {channels.map((item) => {
                  const platformCode = toPlatformBadge(item.platform);
                  const isMain = Boolean(
                    creatorProfile?.mainPlatform && creatorProfile?.socialUrl && creatorProfile.mainPlatform === platformCode && creatorProfile.socialUrl === item.url
                  );
                  const isApproved = item.status === "APPROVED";

                  return (
                    <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-zinc-900">{item.platform}</p>
                          <StatusBadge status={platformCode} />
                          {isMain ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Kênh chính</span> : null}
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-1 break-all text-sm text-zinc-600">{item.url}</p>
                      <p className="text-sm text-zinc-600">Người theo dõi: {item.followerCount.toLocaleString("vi-VN")}</p>
                      {item.rejectReason ? <p className="mt-1 text-sm text-red-600">Lý do từ chối: {item.rejectReason}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button className="dc-btn-secondary" onClick={() => void setMainChannel(item.id)} disabled={saving || !isApproved || isMain}>Chọn kênh chính</button>
                        <button className="dc-btn-secondary" onClick={() => void removeChannel(item.id)} disabled={saving}>Xóa</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="dc-card p-4">
            <SectionHeader title="Thêm kênh mới" subtitle="Kênh mới sẽ ở trạng thái PENDING để admin duyệt." />
            <div className="grid gap-3">
              <FormField label="Nền tảng">
                <select className="dc-input" value={draft.platform} onChange={(event) => setDraft((current) => ({ ...current, platform: event.target.value as typeof emptyDraft.platform }))}>
                  <option value="TikTok">TikTok</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="YouTube">YouTube</option>
                </select>
              </FormField>
              <FormField label="URL kênh">
                <input className="dc-input" type="url" placeholder="https://..." value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} />
              </FormField>
              <FormField label="Số lượng follower">
                <input className="dc-input" type="text" inputMode="numeric" placeholder="0" value={formatIntForInput(draft.followerCount)} onChange={(event) => setDraft((current) => ({ ...current, followerCount: parseNonNegativeInt(event.target.value) }))} />
              </FormField>
              <button className="dc-btn-primary" disabled={saving || !canSubmitChannel} onClick={() => void addChannel()}>{saving ? "Đang lưu..." : "Thêm kênh"}</button>
            </div>
          </article>
        </section>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
