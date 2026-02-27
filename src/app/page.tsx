import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>CarryGo Platform</h1>
      <p>Multi-tenant ride-hailing SaaS starter.</p>
      <div className="grid">
        <Link className="card" href="/super-admin">
          Super Admin Dashboard
        </Link>
        <Link className="card" href="/tenant-admin/login">
          Tenant Admin Dashboard
        </Link>
      </div>
    </main>
  );
}
