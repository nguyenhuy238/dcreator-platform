"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { ClickableUrl } from "@/app/components/dcreator/ui/clickable-url";
import { AccountPasswordResetCard } from "@/app/dashboard/_components/AccountPasswordResetCard";
import { BrandUpgradeTabPanel } from "@/app/dashboard/user/_components/BrandUpgradeTabPanel";
import { resolveImageUrl } from "@/lib/images/resolve-image-url";

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
  platform: "TikTok" | "Instagram" | "YouTube" | "Facebook" | "Shopee" | "Other";
  handle: string;
  url: string;
  followerCount: number;
  engagementRate: number | null;
  isActive: boolean;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
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
type ChannelDraft = {
  platform: Channel["platform"];
  handle: string;
  url: string;
  followerCount: number;
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };
type AvatarUploadResponse = { avatarUrl: string };

const categoryOptions = ["Lifestyle", "Food", "Beauty", "Tech", "Education", "Gaming", "Affiliate", "UGC"];
const emptyDraft: ChannelDraft = { platform: "TikTok", handle: "", url: "", followerCount: 0 };

function toPlatformBadge(platform: Channel["platform"]) {
  if (platform === "TikTok") return "TIKTOK";
  if (platform === "Instagram") return "INSTAGRAM";
  if (platform === "YouTube") return "YOUTUBE";
  if (platform === "Facebook") return "FACEBOOK";
  if (platform === "Shopee") return "SHOPEE";
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

function getChannelUsageLabel(item: Channel) {
  return item.isActive ? "Đang sử dụng" : "Tạm ngừng";
}

export default function CreatorProfilePage() {
  const [activeTab, setActiveTab] = useState<"profile" | "channels" | "brand-upgrade">("profile");

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
  const [draft, setDraft] = useState(emptyDraft);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);

  const bioCount = useMemo(() => bio.trim().length, [bio]);
  const avatarPreviewSrc = useMemo(() => resolveImageUrl(avatarUrl, ""), [avatarUrl]);
  const canSubmitChannel = useMemo(() => draft.url.trim().length > 0 && draft.handle.trim().length > 0, [draft.url, draft.handle]);

  const loadProfile = useCallback(async () => {
    const response = await fetch("/api/creator/dashboard/profile", { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<CreatorProfile>;
    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? "Không thể tải hồ sơ Creator");
    }
    setDisplayName(payload.data.displayName ?? "");
    setAvatarUrl(payload.data.avatarUrl ?? "");
    setBio(payload.data.bio ?? "");
    setCategories(payload.data.categories ?? []);
  }, []);

  const loadChannels = useCallback(async () => {
    const response = await fetch("/api/creator/dashboard/channels", { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<ChannelsPayload>;
    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error ?? "Không thể tải danh sách kênh");
    }
    setChannels(payload.data.channels ?? []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadProfile(), loadChannels()]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải dữ liệu Creator");
    } finally {
      setLoading(false);
    }
  }, [loadChannels, loadProfile]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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

  async function saveChannel() {
    if (!canSubmitChannel) return;
    setSaving(true);
    setError("");
    try {
      const endpoint = editingChannelId ? `/api/creator/dashboard/channels/${editingChannelId}` : "/api/creator/dashboard/channels";
      const method = editingChannelId ? "PATCH" : "POST";
      const payloadBody = {
        platform: draft.platform,
        handle: draft.handle.trim(),
        url: draft.url.trim(),
        followerCount: draft.followerCount
      };
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });
      const payload = (await response.json()) as ApiResponse<ChannelsPayload>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể lưu kênh");
      setChannels(payload.data.channels);
      setDraft(emptyDraft);
      setEditingChannelId(null);
      setToast(editingChannelId ? "Đã cập nhật kênh." : "Đã thêm kênh mới.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể lưu kênh");
    } finally {
      setSaving(false);
    }
  }

  function startEditChannel(channel: Channel) {
    setEditingChannelId(channel.id);
    setDraft({
      platform: channel.platform,
      handle: channel.handle,
      url: channel.url,
      followerCount: channel.followerCount
    });
  }

  async function removeChannel(linkId: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/creator/dashboard/channels/${linkId}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiResponse<ChannelsPayload>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể xóa kênh");
      setChannels(payload.data.channels);
      setToast("Đã xóa kênh.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xóa kênh");
    } finally {
      setSaving(false);
    }
  }

  async function toggleChannelActive(linkId: string, isActive: boolean) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/creator/dashboard/channels/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive })
      });
      const payload = (await response.json()) as ApiResponse<ChannelsPayload>;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? "Không thể cập nhật trạng thái kênh");
      setChannels(payload.data.channels);
      setToast(isActive ? "Đã kích hoạt kênh." : "Đã tạm ngừng kênh.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật trạng thái kênh");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Cài đặt Creator" subtitle="Quản lý hồ sơ, kênh xã hội và mở rộng quyền từ cùng một nơi." />

      <div className="mb-4 flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === "profile" ? "bg-zinc-900 !text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
        >
          Thông tin cơ bản
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("channels")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === "channels" ? "bg-zinc-900 !text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
        >
          Kênh mạng xã hội
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("brand-upgrade")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === "brand-upgrade" ? "bg-zinc-900 !text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
        >
          Nâng cấp Brand
        </button>
      </div>

      {error ? <ErrorState title="Không thể xử lý hồ sơ" description={error} onRetry={() => void loadAll()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && activeTab === "profile" ? (
        <section className="grid gap-4">
          <form className="dc-card grid gap-4 p-5" onSubmit={submitProfile}>
            <SectionHeader title="Thông tin Creator" />
            <div className="grid gap-4 lg:grid-cols-2">
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

              <div className="lg:col-span-2">
                <FormField label={`Bio (${bioCount}/1000)`}>
                  <textarea className="dc-input min-h-28" maxLength={1000} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Mô tả ngắn về phong cách nội dung, thế mạnh và tệp audience..." />
                </FormField>
              </div>

              <div className="lg:col-span-2">
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
            </div>

            <button type="submit" className="dc-btn-primary w-fit" disabled={saving || uploadingAvatar}>
              {saving ? "Đang lưu..." : "Lưu hồ sơ Creator"}
            </button>
          </form>

          <article className="dc-card p-5">
            <SectionHeader title="Xem trước hồ sơ" />
            {!displayName && !bio ? (
              <EmptyState title="Hồ sơ còn trống" description="Hãy cập nhật thông tin để Brand dễ đánh giá." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-start">
                <div className="flex items-center gap-3">
                  {avatarPreviewSrc ? (
                    <div className="h-16 w-16 rounded-2xl border border-zinc-200 bg-cover bg-center" style={{ backgroundImage: `url(${avatarPreviewSrc})` }} />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-black text-white">{displayName.slice(0, 1).toUpperCase() || "C"}</div>
                  )}
                  <div>
                    <p className="font-bold text-zinc-900">{displayName || "Tên Creator"}</p>
                    <p className="text-sm text-zinc-600">{categories.join(", ") || "Chưa chọn lĩnh vực"}</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <p className="text-sm text-zinc-600">{bio || "Chưa có bio"}</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.length > 0 ? categories.map((category) => (
                      <span key={category} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
                        {category}
                      </span>
                    )) : <span className="text-sm text-zinc-500">Chưa chọn lĩnh vực</span>}
                  </div>
                </div>
              </div>
            )}
          </article>

          <AccountPasswordResetCard />

        </section>
      ) : null}

      {!loading && activeTab === "channels" ? (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <article className="dc-card p-4">
            <SectionHeader title="Danh sách kênh" subtitle={`${channels.length} kênh`} />
            {channels.length === 0 ? (
              <EmptyState title="Bạn chưa liên kết kênh nào" description="Thêm kênh đầu tiên để hệ thống đánh giá Creator tốt hơn." />
            ) : (
              <div className="grid gap-3">
                {channels.map((item) => {
                  const platformCode = toPlatformBadge(item.platform);
                  return (
                    <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-zinc-900">{item.platform}</p>
                          <StatusBadge status={platformCode} />
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${item.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                          {getChannelUsageLabel(item)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm">
                        <ClickableUrl url={item.url} label={item.url} />
                      </div>
                      <p className="text-sm text-zinc-600">Tên tài khoản / ID kênh: @{item.handle}</p>
                      <p className="text-sm text-zinc-600">Người theo dõi: {item.followerCount.toLocaleString("vi-VN")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button className="dc-btn-secondary" onClick={() => void toggleChannelActive(item.id, !item.isActive)} disabled={saving}>
                          {item.isActive ? "Tạm ngừng" : "Kích hoạt"}
                        </button>
                        <button className="dc-btn-secondary" onClick={() => startEditChannel(item)} disabled={saving}>Sửa</button>
                        <button className="dc-btn-secondary" onClick={() => void removeChannel(item.id)} disabled={saving}>Xóa</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="dc-card p-4">
            <SectionHeader title={editingChannelId ? "Chỉnh sửa kênh" : "Thêm kênh mới"} subtitle="Kênh mới hoặc chỉnh sửa có thể sử dụng ngay sau khi lưu." />
            <div className="grid gap-3">
              <FormField label="Nền tảng">
                <select className="dc-input" value={draft.platform} onChange={(event) => setDraft((current) => ({ ...current, platform: event.target.value as typeof emptyDraft.platform }))}>
                  <option value="TikTok">TikTok</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Shopee">Shopee</option>
                  <option value="Other">Khác</option>
                </select>
              </FormField>
              <FormField label="Tên tài khoản / ID kênh">
                <input className="dc-input" placeholder="@creator_handle" value={draft.handle} onChange={(event) => setDraft((current) => ({ ...current, handle: event.target.value }))} />
              </FormField>
              <FormField label="URL kênh">
                <input className="dc-input" type="url" placeholder="https://..." value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} />
              </FormField>
              <FormField label="Số lượng follower">
                <input className="dc-input" type="text" inputMode="numeric" placeholder="0" value={formatIntForInput(draft.followerCount)} onChange={(event) => setDraft((current) => ({ ...current, followerCount: parseNonNegativeInt(event.target.value) }))} />
              </FormField>
              <button className="dc-btn-primary" disabled={saving || !canSubmitChannel} onClick={() => void saveChannel()}>{saving ? "Đang lưu..." : editingChannelId ? "Cập nhật kênh" : "Thêm kênh"}</button>
              {editingChannelId ? (
                <button
                  className="dc-btn-secondary"
                  disabled={saving}
                  onClick={() => {
                    setEditingChannelId(null);
                    setDraft(emptyDraft);
                  }}
                >
                  Hủy chỉnh sửa
                </button>
              ) : null}
            </div>
          </article>
        </section>
      ) : null}

      {!loading && activeTab === "brand-upgrade" ? <BrandUpgradeTabPanel /> : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
