import { prisma } from "../db";

export async function listActiveRewards() {
  return prisma.reward.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" }
  });
}
