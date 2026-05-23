"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string;
  status: string;
  displayName: string;
  socialUrl: string;
  rejectReason: string | null;
  account: { email: string; displayName: string };
};

type CampaignApplicationItem = {
  id: string;
  lifecycleStatus: "ACCEPTED" | "DOING" | "REJECTED" | string;
  rejectReason: string | null;
  account: {
    email: string;
    displayName: string;
    creatorProfile: {
      mainPlatform: string;
      socialUrl: string;
      followerCount: number | null;
    } | null;
  };
  mission: {
    title: string;
    audience: string;
    campaign: { title: string; slug: string };
  };
};

export default function CreatorApplicationsAdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [campaignItems, setCampaignItems] = useState<CampaignApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [campaignStatus, setCampaignStatus] = useState("ACCEPTED");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const creatorParams = new URLSearchParams();
      if (status) creatorParams.set("status", status);
      if (query.trim()) creatorParams.set("query", query.trim());

      const campaignParams = new URLSearchParams();
      if (campaignStatus) campaignParams.set("status", campaignStatus);
      if (query.trim()) campaignParams.set("query", query.trim());

      const [creatorRes, campaignRes] = await Promise.all([
        fetch(`/api/admin/dashboard/creator-applications?${creatorParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/dashboard/creator-campaign-applications?${campaignParams.toString()}`, { cache: "no-store" })
      ]);

      const creatorBody = await creatorRes.json();
      const campaignBody = await campaignRes.json();

      if (!creatorRes.ok || !creatorBody.success) {
        throw new Error(creatorBody.error ?? "Load creator applications failed");
      }
      if (!campaignRes.ok || !campaignBody.success) {
        throw new Error(campaignBody.error ?? "Load creator campaign applications failed");
      }

      setItems(creatorBody.data as Item[]);
      setCampaignItems(campaignBody.data as CampaignApplicationItem[]);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [campaignStatus, query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: "APPROVED" | "REJECTED" | "NEEDS_REVISION") {
    let rejectReason: string | undefined;
    if (decision !== "APPROVED") {
      rejectReason = window.prompt("Nhập lý do (>=10 ký tự):", "Thiếu thông tin hồ sơ") ?? "";
      if (!rejectReason || rejectReason.trim().length < 10) return;
    }
    const res = await fetch(`/api/admin/dashboard/creator-applications/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision, rejectReason })
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Action failed");
      return;
    }
    await load();
  }

  async function decideCampaignApplication(id: string, decision: "APPROVED" | "REJECTED") {
    let rejectReason: string | undefined;
    if (decision === "REJECTED") {
      rejectReason = window.prompt("Nhập lý do từ chối (>=10 ký tự):", "Chưa phù hợp tiêu chí campaign") ?? "";
      if (!rejectReason || rejectReason.trim().length < 10) return;
    }

    const res = await fetch(`/api/admin/dashboard/creator-campaign-applications/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decision === "REJECTED" ? { decision, rejectReason } : { decision })
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Campaign application action failed");
      return;
    }

    await load();
  }

  return (
    <main>
      <h1 className="text-2xl font-black">Creator Applications</h1>
      <section className="mt-6">
        <h2 className="text-xl font-bold">Campaign Creator Applications (Nhiệm vụ)</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <select className="dc-input max-w-56" value={campaignStatus} onChange={(e) => setCampaignStatus(e.target.value)}>
            <option value="">All</option>
            <option value="ACCEPTED">ACCEPTED (Chờ duyệt)</option>
            <option value="DOING">DOING (Đã nhận nhiệm vụ)</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <button className="dc-btn-primary" onClick={() => void load()}>Filter</button>
        </div>
        <div className="mt-4 grid gap-3">
          {campaignItems.map((item) => (
            <article key={item.id} className="dc-card p-4">
              <p className="font-semibold">{item.account.displayName} ({item.account.email})</p>
              <p className="text-sm">Campaign: {item.mission.campaign.title}</p>
              <p className="text-sm">Mission: {item.mission.title} ({item.mission.audience})</p>
              <p className="text-sm">Status: {item.lifecycleStatus}</p>
              {item.account.creatorProfile ? (
                <p className="text-sm">
                  Profile: {item.account.creatorProfile.mainPlatform} - {item.account.creatorProfile.socialUrl} - Followers: {item.account.creatorProfile.followerCount ?? 0}
                </p>
              ) : (
                <p className="text-sm text-amber-700">Creator chưa có CreatorProfile.</p>
              )}
              {item.rejectReason ? <p className="text-sm text-red-700">Reject reason: {item.rejectReason}</p> : null}
              <div className="mt-3 flex gap-2">
                <button
                  className="dc-btn-primary"
                  onClick={() => void decideCampaignApplication(item.id, "APPROVED")}
                  disabled={item.lifecycleStatus === "DOING"}
                >
                  Approve
                </button>
                <button className="dc-btn-secondary" onClick={() => void decideCampaignApplication(item.id, "REJECTED")}>
                  Reject
                </button>
              </div>
            </article>
          ))}
          {campaignItems.length === 0 ? <p className="text-sm text-zinc-600">Không có creator campaign applications.</p> : null}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <select className="dc-input max-w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="PENDING_REVIEW">PENDING_REVIEW</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="NEEDS_REVISION">NEEDS_REVISION</option>
        </select>
        <input className="dc-input max-w-80" placeholder="Search email/display/social" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="dc-btn-primary" onClick={() => void load()}>Filter</button>
      </div>
      {loading ? <p className="mt-4">Loading...</p> : null}
      {error ? <p className="mt-4 text-red-700">{error}</p> : null}
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="dc-card p-4">
            <p className="font-semibold">{item.displayName} ({item.account.email})</p>
            <p className="text-sm">Social: {item.socialUrl}</p>
            <p className="text-sm">Status: {item.status}</p>
            {item.rejectReason ? <p className="text-sm text-red-700">Reject reason: {item.rejectReason}</p> : null}
            <div className="mt-3 flex gap-2">
              <button className="dc-btn-primary" onClick={() => void decide(item.id, "APPROVED")}>Approve</button>
              <button className="dc-btn-secondary" onClick={() => void decide(item.id, "REJECTED")}>Reject</button>
              <button className="dc-btn-secondary" onClick={() => void decide(item.id, "NEEDS_REVISION")}>Needs revision</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
