import { redirect } from "next/navigation";

export default function CreatorChannelsPage() {
  redirect("/dashboard/creator/profile?tab=channels");
}
