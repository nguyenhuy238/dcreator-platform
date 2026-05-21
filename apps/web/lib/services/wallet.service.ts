import { AppError } from "../errors";
import { prisma } from "../db";

export async function getWalletByUser(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  if (!wallet) {
    throw new AppError("Wallet not found", 404);
  }

  return wallet;
}
