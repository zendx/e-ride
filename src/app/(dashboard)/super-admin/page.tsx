import { prisma } from "@/lib/db";
import { EnrollTenantForm } from "./enroll-tenant-form";

export default async function SuperAdminPage() {
  const [tenantCount, openKyc, activeTrips, complaintCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.kycDocument.count({ where: { status: "pending" } }),
    prisma.trip.count({ where: { status: { in: ["requested", "assigned", "accepted", "in_progress"] } } }),
    prisma.complaint.count({ where: { status: { in: ["open", "investigating"] } } })
  ]);

  return (
    <main className="container">
      <h1>CarryGo Super Admin</h1>
      <div className="grid">
        <div className="card"><strong>Tenants</strong><p>{tenantCount}</p></div>
        <div className="card"><strong>Pending KYC</strong><p>{openKyc}</p></div>
        <div className="card"><strong>Active Trips</strong><p>{activeTrips}</p></div>
        <div className="card"><strong>Open Complaints</strong><p>{complaintCount}</p></div>
      </div>
      <div style={{ marginTop: 20 }}>
        <EnrollTenantForm />
      </div>
    </main>
  );
}
