"use client";

import { useEffect, useMemo, useState } from "react";

type ApiPayload<T> = { success: boolean; data: T; error?: string };

type Overview = {
  totalJobs: number;
  pendingProofs: number;
  approvedVideos: number;
  totalCommission: number;
  availablePayoutBalance: number;
};

type MarketplaceJob = {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  rewardCommissionVnd: number;
  campaign: { title: string; slug: string; category: string };
};

type MyJob = {
  id: string;
  title: string;
  missionId: string;
  statusGroup: "accepted" | "in_progress" | "submitted" | "approved" | "rejected";
  rejectReason: string | null;
};

type Profile = {
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  categories: string[];
  socialLinks: Array<{ label: string; url: string }>;
};

type Channels = {
  channels: Array<{ platform: string; url: string; followerCount: number; isVerified: boolean }>;
};

type Commission = {
  lines: Array<{ submissionId: string; missionTitle: string; fixedFeeVnd: number; salesCommissionVnd: number; payoutStatus: string }>;
};

type Portfolio = {
  approvedContent: Array<{ id: string; videoUrl: string | null; mission: { title: string; campaign: { title: string } } }>;
  campaignHistory: Array<{ id: string; mission: { title: string; campaign: { title: string } } }>;
};

type Payout = {
  availableBalanceVnd: number;
  history: Array<{ id: string; amountVnd: number; status: string; createdAt: string }>;
};

async function fetcher<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const payload = (await res.json()) as ApiPayload<T>;
  if (!res.ok || !payload.success) {
    throw new Error(payload.error ?? "Load failed");
  }
  return payload.data;
}

export function CreatorDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [marketplace, setMarketplace] = useState<MarketplaceJob[]>([]);
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [commission, setCommission] = useState<Commission | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [channels, setChannels] = useState<Channels | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [proof, setProof] = useState({ submissionId: "", videoUrl: "", screenshotUrl: "", note: "" });
  const [payoutForm, setPayoutForm] = useState({ amountVnd: "", note: "" });
  const [message, setMessage] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [o, m, j, c, p, ch, pf, po] = await Promise.all([
        fetcher<Overview>("/api/creator/dashboard/overview"),
        fetcher<MarketplaceJob[]>("/api/creator/dashboard/marketplace"),
        fetcher<MyJob[]>("/api/creator/dashboard/my-jobs"),
        fetcher<Commission>("/api/creator/dashboard/commission"),
        fetcher<Profile>("/api/creator/dashboard/profile"),
        fetcher<Channels>("/api/creator/dashboard/channels"),
        fetcher<Portfolio>("/api/creator/dashboard/portfolio"),
        fetcher<Payout>("/api/creator/dashboard/payouts")
      ]);
      setOverview(o);
      setMarketplace(m);
      setMyJobs(j);
      setCommission(c);
      setProfile(p);
      setChannels(ch);
      setPortfolio(pf);
      setPayout(po);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const groupedJobs = useMemo(() => {
    return {
      accepted: myJobs.filter((x) => x.statusGroup === "accepted"),
      in_progress: myJobs.filter((x) => x.statusGroup === "in_progress"),
      submitted: myJobs.filter((x) => x.statusGroup === "submitted"),
      approved: myJobs.filter((x) => x.statusGroup === "approved"),
      rejected: myJobs.filter((x) => x.statusGroup === "rejected")
    };
  }, [myJobs]);

  async function acceptJob(missionId: string) {
    const res = await fetch(`/api/creator/dashboard/marketplace/${missionId}/accept`, { method: "POST" });
    const payload = (await res.json()) as ApiPayload<unknown>;
    if (!res.ok || !payload.success) {
      setMessage(payload.error ?? "Accept job failed");
      return;
    }
    setMessage("Accepted job successfully");
    await loadAll();
  }

  async function submitProof() {
    const res = await fetch(`/api/creator/dashboard/proofs/${proof.submissionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl: proof.videoUrl, screenshotUrl: proof.screenshotUrl || undefined, note: proof.note || undefined })
    });
    const payload = (await res.json()) as ApiPayload<unknown>;
    setMessage(res.ok && payload.success ? "Submitted proof" : payload.error ?? "Submit proof failed");
    if (res.ok && payload.success) await loadAll();
  }

  async function requestPayout() {
    const amount = Number(payoutForm.amountVnd);
    const res = await fetch("/api/creator/dashboard/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountVnd: amount, note: payoutForm.note || undefined, idempotencyKey: `payout_${Date.now()}` })
    });
    const payload = (await res.json()) as ApiPayload<unknown>;
    setMessage(res.ok && payload.success ? "Payout request created" : payload.error ?? "Payout request failed");
    if (res.ok && payload.success) await loadAll();
  }

  if (loading) return <main className="container"><h1>Creator Dashboard</h1><p>Loading creator dashboard...</p></main>;
  if (error) return <main className="container"><h1>Creator Dashboard</h1><p className="error">{error}</p></main>;

  return (
    <main className="container">
      <h1>Creator Dashboard</h1>
      {message ? <p>{message}</p> : null}

      <section>
        <h2>Overview</h2>
        {overview ? (
          <ul>
            <li>Total jobs: {overview.totalJobs}</li>
            <li>Pending proofs: {overview.pendingProofs}</li>
            <li>Approved videos: {overview.approvedVideos}</li>
            <li>Total commission: {overview.totalCommission.toLocaleString("vi-VN")} VND</li>
            <li>Available payout balance: {overview.availablePayoutBalance.toLocaleString("vi-VN")} VND</li>
          </ul>
        ) : <p>Empty overview.</p>}
      </section>

      <section>
        <h2>Job/Campaign Marketplace</h2>
        {marketplace.length === 0 ? <p>Không có job phù hợp.</p> : marketplace.map((job) => (
          <article key={job.id}>
            <h3>{job.title}</h3>
            <p>Campaign: {job.campaign.title}</p>
            <p>{job.description}</p>
            <p>Fee: {job.rewardCommissionVnd.toLocaleString("vi-VN")} VND | Points: {job.rewardPoints}</p>
            <button onClick={() => acceptJob(job.id)}>Apply/Accept</button>
          </article>
        ))}
      </section>

      <section>
        <h2>My Jobs</h2>
        <p>Accepted: {groupedJobs.accepted.length} | In progress: {groupedJobs.in_progress.length} | Submitted: {groupedJobs.submitted.length} | Approved: {groupedJobs.approved.length} | Rejected: {groupedJobs.rejected.length}</p>
        {myJobs.length === 0 ? <p>Bạn chưa nhận job nào.</p> : myJobs.map((job) => <p key={job.id}>{job.title} - {job.statusGroup}{job.rejectReason ? ` - ${job.rejectReason}` : ""}</p>)}
      </section>

      <section>
        <h2>Proof Submission</h2>
        <input placeholder="submissionId" value={proof.submissionId} onChange={(e) => setProof({ ...proof, submissionId: e.target.value })} />
        <input placeholder="video URL" value={proof.videoUrl} onChange={(e) => setProof({ ...proof, videoUrl: e.target.value })} />
        <input placeholder="screenshot URL" value={proof.screenshotUrl} onChange={(e) => setProof({ ...proof, screenshotUrl: e.target.value })} />
        <textarea placeholder="note" value={proof.note} onChange={(e) => setProof({ ...proof, note: e.target.value })} />
        <button onClick={submitProof}>Submit proof</button>
      </section>

      <section>
        <h2>Commission</h2>
        {!commission || commission.lines.length === 0 ? <p>Chưa có commission.</p> : commission.lines.map((line) => (
          <p key={line.submissionId}>{line.missionTitle} - Fixed fee: {line.fixedFeeVnd.toLocaleString("vi-VN")} - Sales commission: {line.salesCommissionVnd.toLocaleString("vi-VN")} - {line.payoutStatus}</p>
        ))}
      </section>

      <section>
        <h2>Creator Profile</h2>
        {profile ? <>
          <p>Display name: {profile.displayName}</p>
          <p>Avatar: {profile.avatarUrl || "N/A"}</p>
          <p>Bio: {profile.bio || "N/A"}</p>
          <p>Categories: {profile.categories.join(", ") || "N/A"}</p>
          <p>Social links: {profile.socialLinks.map((x) => `${x.label}: ${x.url}`).join(" | ") || "N/A"}</p>
        </> : <p>Empty profile.</p>}
      </section>

      <section>
        <h2>Creator Channels</h2>
        {!channels || channels.channels.length === 0 ? <p>Chưa có channel.</p> : channels.channels.map((item) => (
          <p key={`${item.platform}_${item.url}`}>{item.platform} - Followers: {item.followerCount} - Verified: {item.isVerified ? "Yes" : "No"}</p>
        ))}
      </section>

      <section>
        <h2>Portfolio</h2>
        <h3>Approved content</h3>
        {!portfolio || portfolio.approvedContent.length === 0 ? <p>Chưa có approved content.</p> : portfolio.approvedContent.map((item) => (
          <p key={item.id}>{item.mission.title} - {item.videoUrl || "No video URL"}</p>
        ))}
        <h3>Campaign history</h3>
        {!portfolio || portfolio.campaignHistory.length === 0 ? <p>Chưa có campaign history.</p> : portfolio.campaignHistory.map((item) => (
          <p key={item.id}>{item.mission.campaign.title} - {item.mission.title}</p>
        ))}
      </section>

      <section>
        <h2>Payout Request</h2>
        <p>Available balance: {payout?.availableBalanceVnd.toLocaleString("vi-VN") ?? 0} VND</p>
        <input placeholder="Amount VND" value={payoutForm.amountVnd} onChange={(e) => setPayoutForm({ ...payoutForm, amountVnd: e.target.value })} />
        <textarea placeholder="Note" value={payoutForm.note} onChange={(e) => setPayoutForm({ ...payoutForm, note: e.target.value })} />
        <button onClick={requestPayout}>Request payout</button>
        <h3>Payout history</h3>
        {!payout || payout.history.length === 0 ? <p>Chưa có payout history.</p> : payout.history.map((item) => (
          <p key={item.id}>{item.amountVnd.toLocaleString("vi-VN")} VND - {item.status}</p>
        ))}
      </section>
    </main>
  );
}
