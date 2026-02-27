import { NextRequest, NextResponse } from "next/server";
import { resolveTenantFromRequest } from "@/lib/modules/tenancy/tenant-resolver";

const PUBLIC_PATHS = ["/", "/api/auth/login", "/api/auth/refresh"];

export async function middleware(request: NextRequest) {
  const tenantContext = await resolveTenantFromRequest(request);

  const requestHeaders = new Headers(request.headers);
  if (tenantContext.tenantId) {
    requestHeaders.set("x-tenant-id", tenantContext.tenantId);
    requestHeaders.set("x-tenant-slug", tenantContext.tenantSlug ?? "");
  }

  const isPublic = PUBLIC_PATHS.includes(request.nextUrl.pathname);
  if (!isPublic && !tenantContext.tenantId && request.nextUrl.pathname.startsWith("/api/tenant")) {
    return NextResponse.json({ error: "Tenant could not be resolved" }, { status: 400 });
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (tenantContext.tenantId) {
    response.headers.set("x-tenant-id", tenantContext.tenantId);
    response.headers.set("x-tenant-slug", tenantContext.tenantSlug ?? "");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
