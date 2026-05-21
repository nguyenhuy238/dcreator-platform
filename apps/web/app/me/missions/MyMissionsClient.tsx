"use client";

import { useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, PageHeader, SectionHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type Mission = {
  id: string;
  lifecycleStatus: string;
  rejectReason: string | null;
  mission: { title: string; campaign: { title: string } };
  reviews: Array<{ id: string; decision: string; createdAt: string }>;
};

const nav = [
  { href: "/dashboard/user", label: "Tổng quan" },
  { href: "/campaigns", label: "Campaign" },
  { href: "/me/missions", label: "Missions" },
  { href: "/vouchers", label: "Voucher" }
];

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
    setMessage(res.ok && payload.success ? "Submitted proof" : payload.error ?? "Submit failed");
  }

  if (!canResubmit) return null;

  return (
    <div className="mt-3 grid gap-2">
      <p className="text-sm font-semibold text-zinc-700">Submit proof</p>
      <input className="dc-input" placeholder="video URL" value={data.videoUrl} onChange={(e) => setData({ ...data, videoUrl: e.target.value })} />
      <input className="dc-input" placeholder="image URL" value={data.imageUrl} onChange={(e) => setData({ ...data, imageUrl: e.target.value })} />
      <input className="dc-input" placeholder="social post URL" value={data.socialPostUrl} onChange={(e) => setData({ ...data, socialPostUrl: e.target.value })} />
      <input className="dc-input" placeholder="screenshot URL" value={data.screenshotUrl} onChange={(e) => setData({ ...data, screenshotUrl: e.target.value })} />
      <input className="dc-input" placeholder="file upload URL" value={data.fileUploadUrl} onChange={(e) => setData({ ...data, fileUploadUrl: e.target.value })} />
      <textarea className="dc-input" placeholder="text note" value={data.proofTextNote} onChange={(e) => setData({ ...data, proofTextNote: e.target.value })} />
      <button className="dc-btn-primary w-fit" onClick={onSubmit}>Submit proof</button>
      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </div>
  );
}

export function MyMissionsClient({ initial }: { initial: Mission[] }) {
  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader title="My Missions" subtitle="Theo dõi trạng thái nhiệm vụ và nộp proof." />
        {initial.length === 0 ? (
          <EmptyState title="Chưa có mission" description="Bạn chưa tham gia mission nào ở thời điểm hiện tại." />
        ) : (
          <section>
            <SectionHeader title="Danh sách mission" subtitle={`${initial.length} mission`} />
            <div className="grid gap-4">
              {initial.map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-zinc-900">{item.mission.title}</h3>
                    <StatusBadge status={item.lifecycleStatus.toLowerCase()} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">Campaign: {item.mission.campaign.title}</p>
                  {item.rejectReason ? <p className="mt-1 text-sm text-red-700">Reject reason: {item.rejectReason}</p> : null}
                  <SubmitProofForm submissionId={item.id} canResubmit={item.lifecycleStatus !== "DONE"} />
                </article>
              ))}
            </div>
          </section>
        )}
      </AppShell>
    </>
  );
}
