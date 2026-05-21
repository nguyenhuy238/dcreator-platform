export default function AdminPage() {
  return (
    <main className="container">
      <h1>Admin/Ops Dashboard</h1>
      <ul>
        <li>Audit log: đang triển khai API ghi sự kiện</li>
        <li>Fraud rules: rate-limit + anomaly detection hooks</li>
        <li>Settlement queue: đối soát payout Creator</li>
      </ul>
    </main>
  );
}
