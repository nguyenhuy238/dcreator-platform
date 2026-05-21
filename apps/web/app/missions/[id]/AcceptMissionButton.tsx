"use client";

import { useState } from "react";

export function AcceptMissionButton({ missionId }: { missionId: string }) {
  const [message, setMessage] = useState("");

  async function onAccept() {
    setMessage("Processing...");
    const res = await fetch(`/api/missions/${missionId}/accept`, { method: "POST" });
    const payload = (await res.json()) as { success: boolean; error?: string };
    if (!res.ok || !payload.success) {
      setMessage(payload.error ?? "Accept failed");
      return;
    }
    setMessage("Accepted mission");
  }

  return (
    <div>
      <button onClick={onAccept}>Accept mission</button>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
