import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>CarryGo Control Center</h1>
      <p className="page-subtitle">Manage multi-tenant ride operations from one platform with secured admin and tenant workspaces.</p>
      <div className="grid">
        <Link className="card" href="/super-admin">
          <strong>Platform</strong>
          <p>Super Admin</p>
          <span className="muted">Tenants, administrators, branding, and system-level controls.</span>
        </Link>
        <Link className="card" href="/tenant-admin/login">
          <strong>Tenant</strong>
          <p>Tenant Admin</p>
          <span className="muted">Real-time operations console for riders, trips, payments, and support.</span>
        </Link>
      </div>
    </main>
  );
}
