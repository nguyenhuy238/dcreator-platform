import { redirect } from "next/navigation";

export default function UserRoleRequestsRedirectPage() {
  redirect("/dashboard/user/settings");
}
