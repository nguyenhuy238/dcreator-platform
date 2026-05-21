"use client";

import { useEffect, useState } from "react";

type QueueItem = { id: string; mission: { title: string }; account: { displayName: string } };

export default function BrandProofQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/proofs").then(async (res) => {
      const payload = (await res.json()) as { success: boolean; data: QueueItem[] };
      if (res.ok && payload.success) setItems(payload.data);
    });
  }, []);

  async function review(id: string, decision: "APPROVED" | "REJECTED") {
    await fetch(`/api/brand/proofs/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, rejectReason: decision === "REJECTED" ? "Need clearer proof" : undefined })
    });
  }

  return (
    <main className="container">
      <h1>Brand proof review queue</h1>
      {items.map((item) => (
        <section key={item.id}>
          <p>{item.mission.title} - {item.account.displayName}</p>
          <button onClick={() => review(item.id, "APPROVED")}>Approve</button>
          <button onClick={() => review(item.id, "REJECTED")}>Reject</button>
        </section>
      ))}
    </main>
  );
}
