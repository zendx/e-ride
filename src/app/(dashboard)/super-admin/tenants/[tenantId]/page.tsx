import { TenantDetailConsole } from "./tenant-detail-console";

type Params = {
  params: Promise<{ tenantId: string }>;
};

export default async function SuperAdminTenantDetailPage({ params }: Params) {
  const { tenantId } = await params;
  return <TenantDetailConsole tenantId={tenantId} />;
}
