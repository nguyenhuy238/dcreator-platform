import { redirect } from "next/navigation";

export default function VouchersLegacyPage() {
  redirect("/dashboard/user/vouchers");
}
