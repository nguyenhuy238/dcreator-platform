import styles from "../campaigns.module.css";

export type CampaignFilterState = {
  search: string;
  type: string;
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
    <section className={`${styles.card} ${styles.filters}`}>
      <div className={styles.cardBody}>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Bộ lọc chiến dịch</p>
        <input
          className={styles.input}
          placeholder="Tìm theo tên chiến dịch, brand, creator"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
        <div className={styles.filtersRow}>
          <select className={styles.select} value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value })}>
            <option value="">Tất cả loại</option>
            <option value="DONATION">Ủng hộ cộng đồng</option>
            <option value="PREORDER">Preorder</option>
            <option value="SPONSORSHIP">Sponsorship</option>
            <option value="COMMUNITY">Community</option>
          </select>
          <select className={styles.select} value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>
            <option value="">Tất cả ngành hàng</option>
            <option value="TECH">Công nghệ</option>
            <option value="FASHION">Thời trang</option>
            <option value="FOOD">Ẩm thực</option>
            <option value="BEAUTY">Làm đẹp</option>
            <option value="LIFESTYLE">Phong cách sống</option>
            <option value="EDUCATION">Giáo dục</option>
          </select>
          <select className={styles.select} value={value.sort} onChange={(e) => onChange({ ...value, sort: e.target.value })}>
            <option value="trending">Phổ biến</option>
            <option value="newest">Mới nhất</option>
            <option value="ending-soon">Sắp kết thúc</option>
            <option value="most-funded">Nhiều ủng hộ nhất</option>
          </select>
        </div>
        <div className={styles.filtersRow}>
          <select className={styles.select} value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })}>
            <option value="ACTIVE">Đang diễn ra</option>
          </select>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={value.rewardAvailable}
              onChange={(e) => onChange({ ...value, rewardAvailable: e.target.checked })}
            />{" "}
            Chỉ hiển thị campaign còn reward
          </label>
        </div>
      </div>
    </section>
  );
}
