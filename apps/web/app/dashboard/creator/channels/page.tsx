"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionToast, EmptyState, ErrorState, FormField, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

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

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

type ChannelsPayload = {
  creatorProfile: CreatorProfileSnapshot | null;
  channels: Channel[];
};

const emptyDraft = {
  platform: "TikTok" as const,
  url: "",
  followerCount: 0
};

function toPlatformBadge(platform: Channel["platform"]) {
  if (platform === "TikTok") return "TIKTOK";
  if (platform === "Instagram") return "INSTAGRAM";
  if (platform === "YouTube") return "YOUTUBE";
  if (platform === "Facebook") return "FACEBOOK";
  return "OTHER";
}

export default function CreatorChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfileSnapshot | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/channels", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<ChannelsPayload>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải danh sách kênh");
      }
      setChannels(payload.data.channels ?? []);
      setCreatorProfile(payload.data.creatorProfile ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải danh sách kênh");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const canSubmit = useMemo(() => draft.url.trim().length > 0, [draft.url]);

  async function addChannel() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const payload = (await response.json()) as ApiResponse<ChannelsPayload>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể thêm kênh");
      }
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
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể xóa kênh");
      }
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
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể cập nhật kênh chính");
      }
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
      <PageHeader title="Kênh mạng xã hội" subtitle="Quản lý kênh Creator, gửi duyệt kênh mới và chọn kênh chính." />

      {error ? <ErrorState title="Không thể tải dữ liệu kênh" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading ? (
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
                    creatorProfile?.mainPlatform &&
                      creatorProfile?.socialUrl &&
                      creatorProfile.mainPlatform === platformCode &&
                      creatorProfile.socialUrl === item.url
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
                        <button
                          className="dc-btn-secondary"
                          onClick={() => void setMainChannel(item.id)}
                          disabled={saving || !isApproved || isMain}
                        >
                          Chọn kênh chính
                        </button>
                        <button className="dc-btn-secondary" onClick={() => void removeChannel(item.id)} disabled={saving}>Xóa</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="dc-card p-4">
            <SectionHeader title="Thêm kênh mới" subtitle="Kênh mới sẽ được tạo ở trạng thái PENDING để admin duyệt." />
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
                <input className="dc-input" type="number" min={0} value={draft.followerCount} onChange={(event) => setDraft((current) => ({ ...current, followerCount: Number(event.target.value) }))} />
              </FormField>
              <button className="dc-btn-primary" disabled={saving || !canSubmit} onClick={() => void addChannel()}>{saving ? "Đang lưu..." : "Thêm kênh"}</button>
            </div>
          </article>
        </section>
      ) : null}

      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}
