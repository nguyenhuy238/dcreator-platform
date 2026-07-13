type AdminPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
};

export function AdminPagination({ page, totalPages, total, limit, onPageChange }: AdminPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Hiển thị {start}-{end} / {total.toLocaleString("vi-VN")} bản ghi
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="dc-btn-secondary" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
          Trang trước
        </button>
        <span className="min-w-24 text-center">
          Trang {page}/{safeTotalPages}
        </span>
        <button type="button" className="dc-btn-secondary" disabled={page >= safeTotalPages} onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}>
          Trang sau
        </button>
      </div>
    </div>
  );
}
