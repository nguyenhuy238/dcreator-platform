"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionToast, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };
type Detail = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  responseSummary: string | null;
  internalNote: string | null;
  relatedBrandId: string | null;
  relatedCreatorId: string | null;
  relatedCampaignId: string | null;
  relatedOrderId: string | null;
  relatedPayoutId: string | null;
  requester: { id: string; displayName: string; email: string; role: string };
  assignee: { id: string; displayName: string; email: string; role: string } | null;
  comments: Array<{ id: string; message: string; isInternal: boolean; createdAt: string; author: { displayName: string; role: string } }>;
};

export default function AdminSupportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [item, setItem] = useState<Detail | null>(null);
  const [status, setStatus] = useState("OPEN");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeAccountId, setAssigneeAccountId] = useState("");
  const [responseSummary, setResponseSummary] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalReply, setIsInternalReply] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/support/${id}`, { cache: "no-store" });
      const body = (await res.json()) as ApiResult<Detail>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Tải chi tiết hỗ trợ thất bại");
      setItem(body.data);
      setStatus(body.data.status);
      setPriority(body.data.priority);
      setAssigneeAccountId(body.data.assignee?.id ?? "");
      setResponseSummary(body.data.responseSummary ?? "");
      setInternalNote(body.data.internalNote ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải chi tiết hỗ trợ thất bại");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveTicket() {
    if (!item) return;
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/support/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          assigneeAccountId: assigneeAccountId.trim() || null,
          responseSummary: responseSummary || undefined,
          internalNote: internalNote || undefined
        })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Update ticket failed");
      setToast("Đã cập nhật support ticket");
      setTimeout(() => setToast(""), 1500);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update ticket failed");
    } finally {
      setActing(false);
    }
  }

  async function sendReply() {
    if (!item) return;
    if (!replyMessage.trim()) {
      setError("Reply message is required.");
      return;
    }
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/support/${item.id}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage.trim(), isInternal: isInternalReply })
      });
      const body = (await res.json()) as ApiResult<unknown>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "Reply failed");
      setReplyMessage("");
      setIsInternalReply(false);
      setToast("Đã gửi phản hồi");
      setTimeout(() => setToast(""), 1500);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply failed");
    } finally {
      setActing(false);
    }
  }

  if (loading) return <><PageHeader title="Chi tiết yêu cầu hỗ trợ" subtitle="Đang tải dữ liệu..." /><LoadingSkeleton rows={5} /></>;
  if (error || !item) return <ErrorState title="Không tải được support detail" description={error || "Lỗi không xác định"} onRetry={() => void load()} />;

  return (
    <>
      <PageHeader title={item.title} subtitle={`Requester: ${item.requester.displayName}`} action={<button className="dc-btn-secondary" onClick={() => router.push("/admin/support")}>Back</button>} />
      {error ? <div className="mb-4"><ErrorState title="Có lỗi thao tác" description={error} onRetry={() => void load()} /></div> : null}
      <section className="dc-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Ticket info</p>
          <div className="flex items-center gap-2"><StatusBadge status={item.priority.toLowerCase()} /><StatusBadge status={item.status.toLowerCase()} /></div>
        </div>
        <p className="mt-2 text-sm text-zinc-700">{item.description}</p>
        <div className="mt-2 grid gap-1 text-xs text-zinc-500">
          <p>Category: {item.category}</p>
          <p>Requester: {item.requester.displayName} ({item.requester.email})</p>
          <p>Assignee: {item.assignee?.displayName ?? "Unassigned"}</p>
          <p>Related IDs: brand={item.relatedBrandId ?? "Không có"} creator={item.relatedCreatorId ?? "Không có"} campaign={item.relatedCampaignId ?? "Không có"} order={item.relatedOrderId ?? "Không có"} payout={item.relatedPayoutId ?? "Không có"}</p>
        </div>
      </section>
      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Update ticket</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="WAITING_USER">WAITING_USER</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <select className="dc-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
          <input className="dc-input md:col-span-2" placeholder="Assignee account id" value={assigneeAccountId} onChange={(e) => setAssigneeAccountId(e.target.value)} />
          <textarea className="dc-input md:col-span-2 min-h-24" placeholder="Response summary (public-facing)" value={responseSummary} onChange={(e) => setResponseSummary(e.target.value)} />
          <textarea className="dc-input md:col-span-2 min-h-24" placeholder="Ghi chú nội bộ (ops)" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
        </div>
        <button className="dc-btn-primary mt-3" disabled={acting} onClick={() => void saveTicket()}>Save ticket</button>
      </section>
      <section className="mt-4 dc-card p-4">
        <p className="font-semibold">Replies / history</p>
        {item.comments.length === 0 ? <p className="mt-2 text-sm text-zinc-600">No comments.</p> : (
          <div className="mt-2 grid gap-2">
            {item.comments.map((comment) => (
              <div key={comment.id} className="rounded-2xl border border-zinc-200 p-3 text-sm">
                <p className="font-semibold">{comment.author.displayName} ({comment.author.role}) {comment.isInternal ? "[INTERNAL]" : ""}</p>
                <p className="text-zinc-700">{comment.message}</p>
              </div>
            ))}
          </div>
        )}
        <textarea className="dc-input mt-3 min-h-24" placeholder="Write reply..." value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} />
        <label className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={isInternalReply} onChange={(e) => setIsInternalReply(e.target.checked)} />
          Internal note only (không gửi notification)
        </label>
        <div>
          <button className="dc-btn-primary mt-3" disabled={acting} onClick={() => void sendReply()}>Send reply</button>
        </div>
      </section>
      {toast ? <ActionToast message={toast} /> : null}
    </>
  );
}

