import Link from "next/link";
import { PageHeader } from "@/app/components/dcreator/ui/base";

export default function AdminCreatorRequestsPage() {
  return (
    <main>
      <PageHeader title="Duyệt Creator" subtitle="Trung tâm duyệt hồ sơ Creator." />
      <article className="dc-card mt-4 p-5">
        <p className="text-sm text-zinc-600">Mở danh sách duyệt chi tiết tại module Creator Applications.</p>
        <Link href="/admin/creator-applications" className="dc-btn-primary mt-3 inline-flex">Mở Creator Applications</Link>
      </article>
    </main>
  );
}
