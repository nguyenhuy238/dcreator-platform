"use client";

import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";

type QueueItem = { id: string; mission: { title: string }; account: { displayName: string }; videoUrl: string | null };

const nav = [
  { href: "/dashboard/brand", label: "Brand Dashboard" },
  { href: "/dashboard/brand/profile", label: "Brand Profile" },
  { href: "/brand", label: "Chiến dịch" },
  { href: "/brand/proofs", label: "Duyệt proof" },
  { href: "/wallet", label: "Quỹ" }
];

export default function BrandProofQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/brand/dashboard/proofs")
      .then(async (res) => {
        const payload = (await res.json()) as { success: boolean; data: QueueItem[]; error?: string };
        if (!res.ok || !payload.success) throw new Error(payload.error ?? "Không tải được proof");
        setItems(payload.data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function review(id: string, decision: "APPROVED" | "REJECTED" | "REVISION") {
    setMessage("");
    const response = await fetch("/api/brand/dashboard/proofs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: id, decision, rejectReason: decision !== "APPROVED" ? "Cần cập nhật proof rõ hơn." : undefined })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    if (!response.ok || !payload.success) {
      setMessage(payload.error ?? "Không thể cập nhật trạng thái proof.");
      return;
    }
    setMessage("Đã cập nhật trạng thái proof.");
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader title="Duyệt proof" subtitle="Duyệt nội dung proof/video Creator đã nộp." />
        {error ? <ErrorState title="Không thể tải proof" description={error} /> : null}
        {message ? <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{message}</p> : null}
        {loading ? <LoadingSkeleton rows={4} /> : null}
        {!loading && !error && items.length === 0 ? <EmptyState title="Không có proof chờ duyệt" description="Khi Creator nộp proof, danh sách sẽ hiển thị tại đây." /> : null}
        <div className="mt-6 grid gap-3">
          {items.map((item) => (
            <section key={item.id} className="dc-card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <p className="font-semibold">
                {item.mission.title} - {item.account.displayName} {item.videoUrl ? `- ${item.videoUrl}` : ""}
              </p>
              <div className="flex gap-2">
                <button className="dc-btn-primary" onClick={() => review(item.id, "APPROVED")}>Approve</button>
                <button className="dc-btn-secondary" onClick={() => review(item.id, "REVISION")}>Needs revision</button>
                <button className="dc-btn-secondary" onClick={() => review(item.id, "REJECTED")}>Reject</button>
              </div>
            </section>
          ))}
        </div>
      </AppShell>
    </>
  );
}
