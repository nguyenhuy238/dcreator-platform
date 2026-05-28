"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTabs } from "@/app/admin/_components/AdminTabs";
import { ReviewActionDialog } from "@/app/admin/_components/ReviewActionDialog";
import { ActionToast, EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/app/components/dcreator/ui/base";
import { ManagementActionMenu } from "@/app/admin/_components/ManagementActionMenu";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Proof = { id: string; lifecycleStatus: string; status: string; rejectReason: string | null; videoUrl: string | null; socialPostUrl: string | null; mission: { title: string; campaign: { title: string; brandId: string } }; account: { displayName: string; email: string } };

const tabs = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING_REVIEW", label: "Chờ duyệt" },
  { key: "NEEDS_REVISION", label: "Cần sửa" },
  { key: "DONE", label: "Đã duyệt" },
  { key: "REJECTED", label: "Bị từ chối" },
  { key: "EXPIRED", label: "Quá hạn" },
  { key: "DISPUTE", label: "Có tranh chấp" },
  { key: "RISK", label: "Có rủi ro" }
];

export default function AdminProofsPage() {
  const [items, setItems] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("PENDING_REVIEW");
  const [action, setAction] = useState<{ type: "approve" | "reject"; id: string } | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/proofs", { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Proof[]>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Không tải được proofs");
      setItems(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được proofs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (tab === "ALL") return items;
    if (tab === "NEEDS_REVISION") return items.filter((x) => x.lifecycleStatus === "REJECTED");
    if (tab === "DONE") return items.filter((x) => x.lifecycleStatus === "DONE");
    if (tab === "REJECTED") return items.filter((x) => x.status === "REJECTED");
    if (tab === "RISK") return items.filter((x) => !x.videoUrl && !x.socialPostUrl);
    if (tab === "PENDING_REVIEW") return items.filter((x) => x.lifecycleStatus === "PENDING_REVIEW");
    return [];
  }, [items, tab]);

  async function decide(type: "approve" | "reject", id: string, reason?: string) {
    const url = type === "approve" ? `/api/admin/proofs/${id}/approve` : `/api/admin/proofs/${id}/reject`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(type === "approve" ? { note: "Approved by admin manage flow" } : { rejectReason: reason, note: reason })
    });
    const body = (await res.json()) as ApiResult<unknown>;
    if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
    await load();
  }

  return (
    <>
      <PageHeader title="Quản lý Mission & Proof" subtitle="Duyệt, yêu cầu sửa, hold/release reward và xử lý tranh chấp proof." action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>} />
      <section className="dc-card p-4"><AdminTabs items={tabs} value={tab} onChange={setTab} /></section>
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được proofs" description={error} onRetry={() => void load()} /></div> : null}
      {!loading && !error ? (
        filtered.length === 0 ? <div className="mt-4"><EmptyState title="Không có proof" description="Không có proof phù hợp bộ lọc." /></div> : (
          <div className="mt-4 grid gap-3">
            {filtered.map((item) => (
              <article key={item.id} className="dc-card p-4">
                <p className="font-semibold">{item.account.displayName} • {item.mission.campaign.title}</p>
                <p className="text-sm text-zinc-600">{item.mission.title} • {item.lifecycleStatus}</p>
                {item.rejectReason ? <p className="mt-1 text-sm text-red-700">Lý do gần nhất: {item.rejectReason}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="dc-btn-primary" onClick={() => setAction({ type: "approve", id: item.id })}>Approve proof</button>
                  <button className="dc-btn-secondary" onClick={() => setAction({ type: "reject", id: item.id })}>Request revision / Reject</button>
                  <ManagementActionMenu
                    items={[
                      { key: "hold", label: "Hold reward", danger: true },
                      { key: "release", label: "Release reward" }
                    ]}
                    onSelect={async (key) => {
                      try {
                        const reason = window.prompt("Nhập lý do:");
                        if (!reason) return;
                        const endpoint = key === "hold" ? "hold-reward" : "release-reward";
                        const res = await fetch(`/api/admin/proofs/${item.id}/${endpoint}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ reason })
                        });
                        const body = await res.json();
                        if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");
                        setToast(key === "hold" ? "Đã hold reward" : "Đã release reward");
                        setTimeout(() => setToast(""), 2000);
                        await load();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Thao tác thất bại");
                      }
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
      {toast ? <ActionToast message={toast} /> : null}
      <ReviewActionDialog open={action?.type === "approve"} title="Approve proof" description="Xác nhận duyệt proof và trigger reward theo logic hiện có." onCancel={() => setAction(null)} onConfirm={() => { const cur = action; setAction(null); if (cur) void decide("approve", cur.id).catch((e) => setError(e.message)); }} />
      <ReviewActionDialog open={action?.type === "reject"} title="Reject / Request revision" description="Bắt buộc nhập lý do." requireReason onCancel={() => setAction(null)} onConfirm={(reason) => { const cur = action; setAction(null); if (cur) void decide("reject", cur.id, reason).catch((e) => setError(e.message)); }} />
    </>
  );
}
