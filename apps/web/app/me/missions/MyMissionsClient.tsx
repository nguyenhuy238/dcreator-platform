"use client";

import { useState } from "react";

type Mission = {
  id: string;
  lifecycleStatus: string;
  rejectReason: string | null;
  mission: { title: string; campaign: { title: string } };
  reviews: Array<{ id: string; decision: string; createdAt: string }>;
};

function Timeline({ status }: { status: string }) {
  return <p>{`Status timeline: open -> accepted/doing -> submitted/pending_review -> approved/done or rejected or expired/cancelled. Current: ${status}`}</p>;
}

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
    <div>
      <h4>Submit proof</h4>
      <input placeholder="video URL" value={data.videoUrl} onChange={(e) => setData({ ...data, videoUrl: e.target.value })} />
      <input placeholder="image URL" value={data.imageUrl} onChange={(e) => setData({ ...data, imageUrl: e.target.value })} />
      <input placeholder="social post URL" value={data.socialPostUrl} onChange={(e) => setData({ ...data, socialPostUrl: e.target.value })} />
      <input placeholder="screenshot URL" value={data.screenshotUrl} onChange={(e) => setData({ ...data, screenshotUrl: e.target.value })} />
      <input placeholder="file upload URL" value={data.fileUploadUrl} onChange={(e) => setData({ ...data, fileUploadUrl: e.target.value })} />
      <textarea placeholder="text note" value={data.proofTextNote} onChange={(e) => setData({ ...data, proofTextNote: e.target.value })} />
      <button onClick={onSubmit}>Submit proof</button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function MyMissionsClient({ initial }: { initial: Mission[] }) {
  return (
    <main className="container">
      <h1>My Missions</h1>
      {initial.map((item) => (
        <section key={item.id}>
          <h3>{item.mission.title}</h3>
          <p>Campaign: {item.mission.campaign.title}</p>
          <Timeline status={item.lifecycleStatus} />
          {item.rejectReason ? <p>Reject reason: {item.rejectReason}</p> : null}
          <SubmitProofForm submissionId={item.id} canResubmit={item.lifecycleStatus !== "DONE"} />
        </section>
      ))}
    </main>
  );
}
