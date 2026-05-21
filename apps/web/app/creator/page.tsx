type MissionItem = {
  id: string;
  title: string;
  rewardPoints: number;
  campaign?: { title: string };
};

async function getMissions() {
  const res = await fetch("http://localhost:3000/api/missions", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Load missions failed");
  }
  return res.json() as Promise<{ data?: MissionItem[] }>;
}

export default async function CreatorPage() {
  let data: MissionItem[] = [];
  let error = "";

  try {
    const result = await getMissions();
    data = result.data ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <main className="container">
      <h1>Creator Dashboard</h1>
      {error ? <p className="error">{error}</p> : null}
      {!error && data.length === 0 ? <p>Hiện chưa có mission mở.</p> : null}
      {data.map((item) => (
        <article key={item.id} className="card">
          <h2>{item.title}</h2>
          <p>Campaign: {item.campaign?.title}</p>
          <p>Reward N-Points: {item.rewardPoints}</p>
        </article>
      ))}
    </main>
  );
}
