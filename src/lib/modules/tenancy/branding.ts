import { prisma } from "@/lib/db";

export async function updateTenantBranding(tenantId: string, payload: {
  appName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail?: string;
  supportPhone?: string;
}) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: payload
  });
}
