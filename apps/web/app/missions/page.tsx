import Link from "next/link";
import { listOpenMissions } from "@/lib/services/mission.service";

export default async function MissionListPage() {
  const missions = await listOpenMissions();
  return (
    <main className="container">
      <h1>Mission List</h1>
      <ul>
        {missions.map((mission) => (
          <li key={mission.id}>
            <Link href={`/missions/${mission.id}`}>{mission.title}</Link> - {mission.campaign.title} - reward {mission.rewardPoints} N-Points
          </li>
        ))}
      </ul>
    </main>
  );
}
