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
        <input
          className={styles.input}
          placeholder="Search title, brand, creator"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
        <div className={styles.filtersRow}>
          <select className={styles.select} value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value })}>
            <option value="">All types</option>
            <option value="DONATION">Donation</option>
            <option value="PREORDER">Preorder</option>
            <option value="SPONSORSHIP">Sponsorship</option>
            <option value="COMMUNITY">Community</option>
          </select>
          <select className={styles.select} value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>
            <option value="">All categories</option>
            <option value="TECH">Tech</option>
            <option value="FASHION">Fashion</option>
            <option value="FOOD">Food</option>
            <option value="BEAUTY">Beauty</option>
            <option value="LIFESTYLE">Lifestyle</option>
            <option value="EDUCATION">Education</option>
          </select>
          <select className={styles.select} value={value.sort} onChange={(e) => onChange({ ...value, sort: e.target.value })}>
            <option value="trending">Trending</option>
            <option value="newest">Newest</option>
            <option value="ending-soon">Ending soon</option>
            <option value="most-funded">Most funded</option>
          </select>
        </div>
        <div className={styles.filtersRow}>
          <select className={styles.select} value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value })}>
            <option value="ACTIVE">Active</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={value.rewardAvailable}
              onChange={(e) => onChange({ ...value, rewardAvailable: e.target.checked })}
            />{" "}
            Reward available only
          </label>
        </div>
      </div>
    </section>
  );
}
