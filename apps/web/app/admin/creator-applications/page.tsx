import Link from "next/link";
import { PageHeader } from "@/app/components/dcreator/ui/base";

export default function CreatorApplicationsAdminPage() {
  return (
    <main>
      <PageHeader
        title="Creator Applications"
        subtitle="Các luồng xử lý đã được tách sang màn chuyên biệt để dễ lọc và vận hành."
      />

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="dc-card p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Duyệt đơn ứng tuyển + xử lý sản phẩm + duyệt hoàn tiền</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Chuyển sang màn Campaign Applications để dùng đầy đủ bộ lọc và thao tác tập trung.
          </p>
          <Link className="dc-btn-primary mt-4 inline-flex" href="/admin/campaign-applications">
            Mở /admin/campaign-applications
          </Link>
        </article>

        <article className="dc-card p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Duyệt video review</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Chuyển sang màn Content Review để kiểm duyệt nội dung theo bộ lọc campaign/creator/brand/platform.
          </p>
          <Link className="dc-btn-primary mt-4 inline-flex" href="/admin/content-review">
            Mở /admin/content-review
          </Link>
        </article>
      </section>
    </main>
  );
}
