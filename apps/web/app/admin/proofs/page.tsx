"use client";

import { useEffect, useState } from "react";

type QueueItem = { id: string; mission: { title: string }; account: { displayName: string }; rejectReason: string | null };

export default function AdminProofQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/proofs").then(async (res) => {
      const payload = (await res.json()) as { success: boolean; data: QueueItem[] };
      if (res.ok && payload.success) setItems(payload.data);
    });
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    const body = action === "approve" ? { note: "ok" } : { rejectReason: "Invalid proof" };
    await fetch(`/api/admin/proofs/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  return (
    <main className="container">
      <h1>Admin proof review queue</h1>
      {items.map((item) => (
        <section key={item.id}>
          <p>{item.mission.title} - {item.account.displayName}</p>
          {item.rejectReason ? <p>Reject reason: {item.rejectReason}</p> : null}
          <button onClick={() => review(item.id, "approve")}>Approve</button>
          <button onClick={() => review(item.id, "reject")}>Reject</button>
        </section>
      ))}
    </main>
  );
}
