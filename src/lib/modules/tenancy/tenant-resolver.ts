import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

type TenantContext = {
  tenantId: string | null;
  tenantSlug: string | null;
};

function parseHost(request: NextRequest) {
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  return hostHeader.split(":")[0].toLowerCase();
}

export async function resolveTenantFromRequest(request: NextRequest): Promise<TenantContext> {
  const host = parseHost(request);
  const platformBaseDomain = (process.env.PLATFORM_BASE_DOMAIN || "carrygo.local").toLowerCase();

  if (!host || host === platformBaseDomain || host === "localhost") {
    return { tenantId: null, tenantSlug: null };
  }

  if (host.endsWith(`.${platformBaseDomain}`)) {
    const subdomain = host.replace(`.${platformBaseDomain}`, "");
    const tenant = await prisma.tenant.findUnique({ where: { slug: subdomain }, select: { id: true, slug: true } });
    return { tenantId: tenant?.id ?? null, tenantSlug: tenant?.slug ?? null };
  }

  const tenantByCustomDomain = await prisma.tenant.findUnique({
    where: { customDomain: host },
    select: { id: true, slug: true }
  });

  return {
    tenantId: tenantByCustomDomain?.id ?? null,
    tenantSlug: tenantByCustomDomain?.slug ?? null
  };
}
