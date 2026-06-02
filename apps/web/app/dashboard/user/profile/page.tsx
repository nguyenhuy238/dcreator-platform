import { redirect } from "next/navigation";

export default function UserProfileRedirectPage() {
  redirect("/dashboard/user/settings");
}
