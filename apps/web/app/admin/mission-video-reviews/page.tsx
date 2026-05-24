import { redirect } from "next/navigation";

export default function AdminMissionVideoReviewsRedirectPage() {
  redirect("/admin/mission-reviews?tab=video-reviews");
}
