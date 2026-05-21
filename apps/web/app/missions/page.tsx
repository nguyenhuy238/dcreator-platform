import Link from "next/link";
import { PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, PageHeader, SectionHeader, StatsCard, StatusBadge } from "@/app/components/dcreator/ui/base";
import { listOpenMissions } from "@/lib/services/mission.service";
import { AcceptMissionButton } from "./[id]/AcceptMissionButton";

function formatDate(value: Date | null) {
  if (!value) return "Không giới hạn";
  return new Date(value).toLocaleDateString("vi-VN");
}

export default async function MissionListPage() {
  const missions = await listOpenMissions();
  const creatorMissions = missions.filter((mission) => mission.audience === "CREATOR");
  const userMissions = missions.filter((mission) => mission.audience === "USER");

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 md:px-6">
        <PageHeader
          title="Mission Marketplace"
          subtitle="Chọn mission phù hợp, nhận task và nộp proof để nhận thưởng."
          action={<Link href="/me/missions" className="dc-btn-primary">Mission của tôi</Link>}
        />

        <section className="dc-grid-dashboard">
          <StatsCard title="Mission đang mở" value={`${missions.length}`} />
          <StatsCard title="Cho User" value={`${userMissions.length}`} />
          <StatsCard title="Cho Creator" value={`${creatorMissions.length}`} />
          <StatsCard title="Campaign hoạt động" value={`${new Set(missions.map((mission) => mission.campaignId)).size}`} />
        </section>

        <section className="mt-8">
          <SectionHeader title="Danh sách mission" subtitle="Sắp xếp theo mission mới nhất" />
          {missions.length === 0 ? (
            <EmptyState
              title="Chưa có mission mở"
              description="Hiện tại chưa có mission nào khả dụng. Vui lòng quay lại sau."
              action={<Link href="/campaigns" className="dc-btn-primary">Khám phá campaign</Link>}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {missions.map((mission) => (
                <article key={mission.id} className="dc-card p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-bold text-zinc-900">{mission.title}</h3>
                    <StatusBadge status="active" />
                  </div>
                  <p className="text-sm text-zinc-600">{mission.description}</p>
                  <div className="mt-3 grid gap-1 text-sm text-zinc-600">
                    <p>Campaign: {mission.campaign.title}</p>
                    <p>Audience: {mission.audience}</p>
                    <p>Thưởng: {mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                    <p>Deadline: {formatDate(mission.deadlineAt)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/missions/${mission.id}`} className="dc-btn-secondary">Xem chi tiết</Link>
                    <Link href={`/campaigns/${mission.campaign.slug}`} className="dc-btn-secondary">Xem campaign</Link>
                  </div>
                  <AcceptMissionButton missionId={mission.id} />
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
