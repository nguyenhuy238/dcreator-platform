import { redirect } from "next/navigation";

export default function WalletLegacyPage() {
  redirect("/dashboard/user/wallet");
}
