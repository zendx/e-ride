import { SuperAdminConsole } from "./super-admin-console";

export default function SuperAdminPage() {
  return (
    <main className="container-fluid">
      <h1 className="page-header mb-3">
        Super Admin <small>platform controls and tenant oversight</small>
      </h1>
      <SuperAdminConsole />
    </main>
  );
}
