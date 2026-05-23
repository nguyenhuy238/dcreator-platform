"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionToast, EmptyState, ErrorState, FormField, LoadingSkeleton, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type Channel = {
  platform: "TikTok" | "Instagram" | "YouTube" | "Facebook";
  url: string;
  followerCount: number;
  isVerified: boolean;
};

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

const emptyRow: Channel = { platform: "TikTok", url: "", followerCount: 0, isVerified: false };

export default function CreatorChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [draft, setDraft] = useState<Channel>(emptyRow);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/channels", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<{ channels: Channel[] }>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải kênh mạng xã hội");
      }
      setChannels(payload.data.channels ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải kênh mạng xã hội");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const canSubmit = useMemo(() => draft.url.trim().length > 0, [draft.url]);

  async function save(next: Channel[]) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/creator/dashboard/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: next })
      });
      const payload = (await response.json()) as ApiResponse<{ channels: Channel[] }>;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể cập nhật kênh");
      }
      setChannels(payload.data.channels);
      setToast("Đã cập nhật kênh mạng xã hội.");
      setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật kênh");
    } finally {
      setSaving(false);
    }
  }

  async function addChannel() {
    if (!canSubmit) return;
    await save([...channels, draft]);
    setDraft(emptyRow);
  }

  async function removeChannel(index: number) {
    const next = channels.filter((_, i) => i !== index);
    await save(next);
  }

  async function toggleVerified(index: number) {
    const next = channels.map((item, i) => (i === index ? { ...item, isVerified: !item.isVerified } : item));
    await save(next);
  }

  return (
    <>
      <PageHeader title="Kênh mạng xã hội" subtitle="Quản lý TikTok, Facebook, Instagram, YouTube để nhận mission phù hợp." />

      {error ? <ErrorState title="Không thể tải kênh" description={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading ? (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <article className="dc-card p-4">
            <SectionHeader title="Danh sách kênh" subtitle={`${channels.length} kênh đã khai báo`} />
            {channels.length === 0 ? (
              <EmptyState title="Chưa có kênh" description="Thêm ít nhất một kênh social để tăng cơ hội được Brand duyệt." />
            ) : (
              <div className="grid gap-3">
                {channels.map((item, index) => (
                  <div key={`${item.platform}-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">{item.platform}</p>
                      <StatusBadge status={item.isVerified ? "APPROVED" : "PENDING"} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 break-all">{item.url}</p>
                    <p className="text-sm text-zinc-600">Follower: {item.followerCount.toLocaleString("vi-VN")}</p>
                    <div className="mt-2 flex gap-2">
                      <button className="dc-btn-secondary" onClick={() => void toggleVerified(index)} disabled={saving}>{item.isVerified ? "Bỏ xác minh" : "Đánh dấu xác minh"}</button>
                      <button className="dc-btn-secondary" onClick={() => void removeChannel(index)} disabled={saving}>Xoá</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="dc-card p-4">
            <SectionHeader title="Thêm kênh mới" />
            <div className="grid gap-3">
              <FormField label="Nền tảng">
                <select className="dc-input" value={draft.platform} onChange={(event) => setDraft((current) => ({ ...current, platform: event.target.value as Channel["platform"] }))}>
                  <option value="TikTok">TikTok</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="YouTube">YouTube</option>
                </select>
              </FormField>
              <FormField label="URL kênh">
                <input className="dc-input" type="url" placeholder="https://..." value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} />
              </FormField>
              <FormField label="Username/follower count">
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
