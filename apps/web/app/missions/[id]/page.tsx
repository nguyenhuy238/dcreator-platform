import { notFound } from "next/navigation";
import { getMissionDetail } from "@/lib/services/mission.service";
import { AcceptMissionButton } from "./AcceptMissionButton";

type Props = { params: Promise<{ id: string }> };

export default async function MissionDetailPage({ params }: Props) {
  const { id } = await params;
  try {
    const mission = await getMissionDetail(id);
    return (
      <main className="container">
        <h1>Mission detail</h1>
        <p>{mission.title}</p>
        <p>{mission.description}</p>
        <p>Status: {mission.status}</p>
        <p>Deadline: {mission.deadlineAt ? new Date(mission.deadlineAt).toLocaleString() : "Không có hạn"}</p>
        <p>Campaign: {mission.campaign.title}</p>
        <AcceptMissionButton missionId={mission.id} />
      </main>
    );
  } catch {
    notFound();
  }
}
