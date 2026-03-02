import Link from "next/link";
import { EnrollTenantForm } from "../enroll-tenant-form";

export default function SuperAdminEnrollPage() {
  return (
    <main className="container-fluid">
      <h1 className="page-header mb-3">
        Enroll Tenant <small>create tenant workspace and first admin</small>
      </h1>
      <p className="mb-3">
        <Link href="/super-admin" className="btn btn-outline-default btn-sm">
          Back to Super Admin Dashboard
        </Link>
      </p>
      <section className="section">
        <EnrollTenantForm />
      </section>
    </main>
  );
}
