type CampaignItem = {
  id: string;
  title: string;
  status: string;
  brand?: { displayName: string };
};

async function getCampaigns() {
  const res = await fetch("http://localhost:3000/api/campaigns?limit=10", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Load campaigns failed");
  }
  return res.json() as Promise<{ data?: CampaignItem[] }>;
}

export default async function BrandPage() {
  let data: CampaignItem[] = [];
  let error = "";

  try {
    const result = await getCampaigns();
    data = result.data ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <main className="container">
      <h1>Brand Dashboard</h1>
      {error ? <p className="error">{error}</p> : null}
      {!error && data.length === 0 ? <p>Chưa có campaign nào.</p> : null}
      {data.map((item) => (
        <article key={item.id} className="card">
          <h2>{item.title}</h2>
          <p>Brand: {item.brand?.displayName}</p>
          <p>Status: {item.status}</p>
        </article>
      ))}
    </main>
  );
}
