import styles from "./campaign-detail.module.css";

export default function LoadingCampaignDetail() {
  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
    </main>
  );
}
