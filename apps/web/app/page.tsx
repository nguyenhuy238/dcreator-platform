import Link from "next/link";

async function getSummary() {
  const [campaignRes, missionRes, rewardRes] = await Promise.all([
    fetch("http://localhost:3000/api/campaigns", { cache: "no-store" }).catch(() => null),
    fetch("http://localhost:3000/api/missions", { cache: "no-store" }).catch(() => null),
    fetch("http://localhost:3000/api/rewards", { cache: "no-store" }).catch(() => null)
  ]);

  if (!campaignRes || !missionRes || !rewardRes) {
    return { ok: false, campaigns: 0, missions: 0, rewards: 0 };
  }

  const [campaignJson, missionJson, rewardJson] = await Promise.all([
    campaignRes.json(),
    missionRes.json(),
    rewardRes.json()
  ]);

  return {
    ok: true,
    campaigns: campaignJson.data?.length ?? 0,
    missions: missionJson.data?.length ?? 0,
    rewards: rewardJson.data?.length ?? 0
  };
}

export default async function HomePage() {
  const summary = await getSummary();

  return (
    <main className="container">
      <h1>dCreator Platform</h1>
      <p>Creator Economy + Social Commerce + Crowd-sponsorship + Reward/Voucher.</p>
      {!summary.ok ? <p className="error">Không thể tải dữ liệu tổng quan. Kiểm tra DB/API.</p> : null}
      <section className="stats">
        <article><h2>{summary.campaigns}</h2><p>Campaign đang hiển thị</p></article>
        <article><h2>{summary.missions}</h2><p>Mission mở</p></article>
        <article><h2>{summary.rewards}</h2><p>Reward/Voucher hoạt động</p></article>
      </section>
      <section className="links">
        <Link href="/creator">Creator Dashboard</Link>
        <Link href="/brand">Brand Dashboard</Link>
        <Link href="/admin">Admin/Ops Dashboard</Link>
      </section>
    </main>
  );
}
