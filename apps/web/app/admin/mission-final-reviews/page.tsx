import { redirect } from "next/navigation";

export default function AdminMissionFinalReviewsRedirectPage() {
  redirect("/admin/mission-reviews?tab=final-reviews");
}
