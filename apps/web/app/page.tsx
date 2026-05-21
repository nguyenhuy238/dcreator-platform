import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>dCreator Standalone</h1>
      <p>Hệ thống Creator Economy độc lập, phát triển trên source hiện tại.</p>
      <section className="links">
        <Link href="/campaigns">Campaign Marketplace</Link>
        <Link href="/missions">Mission list</Link>
        <Link href="/me/missions">My missions</Link>
        <Link href="/admin/proofs">Admin proof queue</Link>
        <Link href="/brand/proofs">Brand proof queue</Link>
        <Link href="/auth/login">Đăng nhập</Link>
      </section>
    </main>
  );
}
