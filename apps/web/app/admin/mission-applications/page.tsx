import { redirect } from "next/navigation";

export default function AdminMissionApplicationsRedirectPage() {
  redirect("/admin/mission-reviews?tab=applications");
}
