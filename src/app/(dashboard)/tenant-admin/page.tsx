import { TenantOpsConsole } from "./tenant-ops-console";

export default async function TenantAdminPage() {
  return (
    <main className="container-fluid">
      <h1 className="page-header mb-3">
        Tenant Operations <small>live riders, trips, payments and support</small>
      </h1>
      <TenantOpsConsole />
    </main>
  );
}
