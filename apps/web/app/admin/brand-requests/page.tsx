import Link from "next/link";
import { PageHeader } from "@/app/components/dcreator/ui/base";

export default function AdminBrandRequestsPage() {
  return (
    <main>
      <PageHeader title="Duyệt Brand" subtitle="Trung tâm duyệt hồ sơ Brand." />
      <article className="dc-card mt-4 p-5">
        <p className="text-sm text-zinc-600">Mở danh sách duyệt chi tiết tại module Brand Applications.</p>
        <Link href="/admin/brand-applications" className="dc-btn-primary mt-3 inline-flex">Mở Brand Applications</Link>
      </article>
    </main>
  );
}
