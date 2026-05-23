"use client";

import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";

type QueueItem = { id: string; mission: { title: string }; account: { displayName: string } };

const nav = [
  { href: "/dashboard/brand", label: "Brand Dashboard" },
  { href: "/dashboard/brand/profile", label: "Brand Profile" },
  { href: "/brand", label: "Chiến dịch" },
  { href: "/brand/proofs", label: "Duyệt proof" },
  { href: "/wallet", label: "Quỹ" }
];

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
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <h1 className="text-3xl font-black">Proof review</h1>
        <div className="mt-6 grid gap-3">
          {items.map((item) => (
            <section key={item.id} className="dc-card flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <p className="font-semibold">{item.mission.title} - {item.account.displayName}</p>
              <div className="flex gap-2">
                <button className="dc-btn-primary" onClick={() => review(item.id, "APPROVED")}>Approve</button>
                <button className="dc-btn-secondary" onClick={() => review(item.id, "REJECTED")}>Reject</button>
              </div>
            </section>
          ))}
        </div>
      </AppShell>
    </>
  );
}
