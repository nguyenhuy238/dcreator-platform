import { prisma } from "../db";

export async function listOpenMissions() {
  return prisma.mission.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { id: true, title: true } }
    }
  });
}
