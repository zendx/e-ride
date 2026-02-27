import { TenantOpsConsole } from "./tenant-ops-console";

export default async function TenantAdminPage() {
  return (
    <main className="container">
      <h1>Tenant Admin Operations</h1>
      <p className="muted">Monitor riders, passengers, and trip lifecycle from request to completion/cancellation.</p>
      <TenantOpsConsole />
    </main>
  );
}
