import { TenantOpsConsole } from "./tenant-ops-console";

export default async function TenantAdminPage() {
  return (
    <main className="container">
      <h1>Tenant Admin Operations</h1>
      <p className="page-subtitle">Monitor riders, passengers, and trip lifecycle from request to completion or cancellation.</p>
      <TenantOpsConsole />
    </main>
  );
}
