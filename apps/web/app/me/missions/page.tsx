import { redirect } from "next/navigation";

export default function MeMissionsLegacyPage() {
  redirect("/dashboard/user/missions");
}
