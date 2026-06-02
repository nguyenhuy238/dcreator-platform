import { redirect } from "next/navigation";

export default function RoleRequestRedirectPage() {
  redirect("/dashboard/user/upgrade");
}
