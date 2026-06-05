export type CampaignFilterState = {
  search: string;
  category: string;
  status: string;
  rewardAvailable: boolean;
  sort: string;
};

export function CampaignFilters({
  value,
  onChange
}: {
  value: CampaignFilterState;
  onChange: (next: CampaignFilterState) => void;
}) {
  return (
    <section className="dc-card p-4">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Bộ lọc chiến dịch</p>
          <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={value.rewardAvailable}
              onChange={(e) => onChange({ ...value, rewardAvailable: e.target.checked })}
            />{" "}
            Chỉ hiển thị campaign đang thực hiện
          </label>
        </div>
        <input
          className="dc-input"
          placeholder="Tìm theo tên chiến dịch, brand, creator"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
        <div className="grid gap-2 md:grid-cols-2">
          <select className="dc-input" value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>
            <option value="">Tất cả ngành hàng</option>
            <option value="TECH">Công nghệ</option>
            <option value="FASHION">Thời trang</option>
            <option value="FOOD">Ẩm thực</option>
            <option value="BEAUTY">Làm đẹp</option>
            <option value="LIFESTYLE">Phong cách sống</option>
            <option value="EDUCATION">Giáo dục</option>
          </select>
          <select className="dc-input" value={value.sort} onChange={(e) => onChange({ ...value, sort: e.target.value })}>
            <option value="trending">Đang diễn ra</option>
            <option value="newest">Mới nhất</option>
            <option value="ending-soon">Sắp kết thúc</option>
            <option value="most-funded">Nhiều ủng hộ nhất</option>
          </select>
        </div>
      </div>
    </section>
  );
}
