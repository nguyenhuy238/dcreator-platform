import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string[] }> };

export default async function OpsCatchAllPage({ params }: Props) {
  const { slug } = await params;
  const safe = slug.filter(Boolean).join("/");
  redirect(`/admin/${safe}`);
}

