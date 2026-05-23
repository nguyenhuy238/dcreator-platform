"use client";

import { useState } from "react";
import Link from "next/link";

export function AcceptMissionButton({ missionId }: { missionId: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onAccept() {
    setLoading(true);
    setMessage("Đang xử lý...");
    try {
      const res = await fetch(`/api/missions/${missionId}/accept`, { method: "POST" });
      const payload = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !payload.success) {
        setMessage(payload.error ?? "Nhận nhiệm vụ thất bại");
        return;
      }
      setMessage("Accepted mission");
    } catch {
      setMessage("Lỗi mạng");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button disabled={loading} onClick={onAccept} className="dc-btn-primary disabled:opacity-60">
        {loading ? "Đang xử lý..." : "Nhận mission"}
      </button>
      <Link href="/me/missions" className="dc-btn-secondary">Mission của tôi</Link>
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </div>
  );
}
