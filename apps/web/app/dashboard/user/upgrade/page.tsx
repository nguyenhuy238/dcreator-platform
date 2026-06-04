import { redirect } from "next/navigation";

export default async function UserUpgradePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  redirect(query ? `/dashboard/user/settings?${query}` : "/dashboard/user/settings");
}
