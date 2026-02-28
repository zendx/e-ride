import Link from "next/link";
import { EnrollTenantForm } from "../enroll-tenant-form";

export default function SuperAdminEnrollPage() {
  return (
    <main className="container">
      <h1>Enroll Tenant</h1>
      <p className="page-subtitle">Create a new tenant workspace and initial tenant admin account.</p>
      <p style={{ marginTop: 12 }}>
        <Link href="/super-admin">Back to Super Admin Dashboard</Link>
      </p>
      <section className="section">
        <EnrollTenantForm />
      </section>
    </main>
  );
}
