"use client";

import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type MissionItem = {
  id: string;
  lifecycleStatus: string;
  rejectReason: string | null;
  mission: { title: string; campaign: { title: string } };
};

function SubmitProofForm({ submissionId, canResubmit }: { submissionId: string; canResubmit: boolean }) {
  const [message, setMessage] = useState("");
  const [data, setData] = useState({ videoUrl: "", imageUrl: "", socialPostUrl: "", screenshotUrl: "", fileUploadUrl: "", proofTextNote: "" });

  async function onSubmit() {
    const res = await fetch(`/api/user-missions/${submissionId}/submit-proof`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const payload = (await res.json()) as { success: boolean; error?: string };
    setMessage(res.ok && payload.success ? "Đã nộp proof" : payload.error ?? "Nộp proof thất bại");
  }

  if (!canResubmit) return null;

  return (
    <div className="mt-3 grid gap-2">
      <p className="text-sm font-semibold text-zinc-700">Nộp proof</p>
      <input className="dc-input" placeholder="Video URL" value={data.videoUrl} onChange={(e) => setData({ ...data, videoUrl: e.target.value })} />
      <input className="dc-input" placeholder="Ảnh URL" value={data.imageUrl} onChange={(e) => setData({ ...data, imageUrl: e.target.value })} />
      <input className="dc-input" placeholder="Link social post" value={data.socialPostUrl} onChange={(e) => setData({ ...data, socialPostUrl: e.target.value })} />
      <textarea className="dc-input" placeholder="Ghi chú" value={data.proofTextNote} onChange={(e) => setData({ ...data, proofTextNote: e.target.value })} />
      <button className="dc-btn-primary w-fit" onClick={onSubmit}>Gửi proof</button>
      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </div>
  );
}

export default function UserMissionsPage() {
  const [items, setItems] = useState<MissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/missions", { cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload.error ?? "Không thể tải nhiệm vụ");
        setItems(payload.data as MissionItem[]);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PublicHeader />
      <AppShell>
        <PageHeader title="Nhiệm vụ của tôi" subtitle="Theo dõi trạng thái nhiệm vụ và proof đã nộp." />
        {error ? <ErrorState title="Không thể tải nhiệm vụ" description={error} /> : null}
        <section className="mt-8">
          <SectionHeader title="Danh sách nhiệm vụ" subtitle={`${items.length} nhiệm vụ`} />
          {loading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState title="Chưa có nhiệm vụ" description="Bạn chưa tham gia nhiệm vụ nào." />
          ) : (
            <div className="grid gap-4">
              {items.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-zinc-900">{item.mission.title}</h3>
                    <StatusBadge status={item.lifecycleStatus.toLowerCase()} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">Campaign: {item.mission.campaign.title}</p>
                  {item.rejectReason ? <p className="mt-1 text-sm text-red-700">Lý do từ chối: {item.rejectReason}</p> : null}
                  <SubmitProofForm submissionId={item.id} canResubmit={item.lifecycleStatus !== "DONE"} />
                </article>
              ))}
            </div>
          )}
        </section>
      </AppShell>
    </>
  );
}
