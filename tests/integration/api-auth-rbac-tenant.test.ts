import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors/app-error";
import { POST as loginPost } from "@/app/(public)/api/auth/login/route";
import { POST as refreshPost } from "@/app/(public)/api/auth/refresh/route";
import { PATCH as tenantBrandingPatch } from "@/app/(public)/api/tenant/branding/route";
import { GET as superAdminTenantsGet, POST as superAdminTenantsPost } from "@/app/(public)/api/super-admin/tenants/route";
import { PATCH as superAdminTenantPatch } from "@/app/(public)/api/super-admin/tenants/[tenantId]/route";
import { GET as superAdminTenantInsightsGet } from "@/app/(public)/api/super-admin/tenants/[tenantId]/insights/route";
import { PATCH as superAdminTenantCredentialsPatch } from "@/app/(public)/api/super-admin/tenants/[tenantId]/credentials/route";

const {
  loginMock,
  refreshMock,
  rateLimitMock,
  getAuthContextMock,
  updateTenantBrandingMock,
  tenantFindManyMock,
  enrollTenantMock,
  tenantFindUniqueMock,
  tenantUpdateMock,
  auditCreateMock,
  riderFindManyMock,
  passengerFindManyMock,
  tripFindManyMock,
  paymentFindManyMock
  ,
  userFindManyMock,
  userFindFirstMock,
  userUpdateMock
} = vi.hoisted(() => ({
  loginMock: vi.fn(),
  refreshMock: vi.fn(),
  rateLimitMock: vi.fn(),
  getAuthContextMock: vi.fn(),
  updateTenantBrandingMock: vi.fn(),
  tenantFindManyMock: vi.fn(),
  enrollTenantMock: vi.fn(),
  tenantFindUniqueMock: vi.fn(),
  tenantUpdateMock: vi.fn(),
  auditCreateMock: vi.fn(),
  riderFindManyMock: vi.fn(),
  passengerFindManyMock: vi.fn(),
  tripFindManyMock: vi.fn(),
  paymentFindManyMock: vi.fn(),
  userFindManyMock: vi.fn(),
  userFindFirstMock: vi.fn(),
  userUpdateMock: vi.fn()
}));

vi.mock("@/lib/modules/auth/service", () => ({
  login: loginMock,
  refresh: refreshMock
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: rateLimitMock
}));

vi.mock("@/lib/auth/context", () => ({
  getAuthContext: getAuthContextMock
}));

vi.mock("@/lib/modules/tenancy/branding", () => ({
  updateTenantBranding: updateTenantBrandingMock
}));

vi.mock("@/lib/modules/tenancy/enrollment", () => ({
  enrollTenant: enrollTenantMock
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tenant: {
      findMany: tenantFindManyMock,
      findUnique: tenantFindUniqueMock,
      update: tenantUpdateMock
    },
    riderProfile: {
      findMany: riderFindManyMock
    },
    passengerProfile: {
      findMany: passengerFindManyMock
    },
    trip: {
      findMany: tripFindManyMock
    },
    paymentTransaction: {
      findMany: paymentFindManyMock
    },
    user: {
      findMany: userFindManyMock,
      findFirst: userFindFirstMock,
      update: userUpdateMock
    },
    auditLog: {
      create: auditCreateMock
    }
  }
}));

describe("auth API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in a user and enforces rate limit by IP", async () => {
    rateLimitMock.mockResolvedValue(undefined);
    loginMock.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { id: "u1", email: "admin@alpha-rides.com", role: "tenant_admin", tenantId: "t1", tenantSlug: "alpha" }
    });

    const response = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.8, 203.0.113.9"
        },
        body: JSON.stringify({ email: "admin@alpha-rides.com", password: "Passw0rd!" })
      })
    );

    expect(rateLimitMock).toHaveBeenCalledWith("rl:auth:login:203.0.113.8", 20, 60);
    expect(loginMock).toHaveBeenCalledWith("admin@alpha-rides.com", "Passw0rd!");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.accessToken).toBe("access-token");
  });

  it("returns 401 when login service rejects credentials", async () => {
    rateLimitMock.mockResolvedValue(undefined);
    loginMock.mockRejectedValue(new AppError("Invalid credentials", 401, "invalid_credentials"));

    const response = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "admin@alpha-rides.com", password: "WrongPass1" })
      })
    );

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error.code).toBe("invalid_credentials");
  });

  it("refreshes access token", async () => {
    refreshMock.mockResolvedValue({ accessToken: "new-access-token" });

    const response = await refreshPost(
      new Request("http://localhost/api/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: "valid-refresh-token" })
      })
    );

    expect(refreshMock).toHaveBeenCalledWith("valid-refresh-token");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.accessToken).toBe("new-access-token");
  });
});

describe("RBAC and tenant isolation API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forbids non-tenant-admin from updating tenant branding", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u1",
      role: "dispatcher",
      tenantId: "tenant-a",
      tenantSlug: "alpha"
    });

    const response = await tenantBrandingPatch(
      new Request("http://localhost/api/tenant/branding", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appName: "AlphaGo",
          primaryColor: "#0EA5E9",
          secondaryColor: "#0F172A"
        })
      }) as never
    );

    expect(response.status).toBe(403);
    expect(updateTenantBrandingMock).not.toHaveBeenCalled();
  });

  it("returns tenant_missing when token has no tenant for tenant route", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u1",
      role: "tenant_admin"
    });

    const response = await tenantBrandingPatch(
      new Request("http://localhost/api/tenant/branding", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appName: "AlphaGo",
          primaryColor: "#0EA5E9",
          secondaryColor: "#0F172A"
        })
      }) as never
    );

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe("tenant_missing");
  });

  it("updates branding using tenant from auth context", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u1",
      role: "tenant_admin",
      tenantId: "tenant-a",
      tenantSlug: "alpha"
    });
    updateTenantBrandingMock.mockResolvedValue({
      id: "tenant-a",
      appName: "AlphaGo"
    });

    const response = await tenantBrandingPatch(
      new Request("http://localhost/api/tenant/branding", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appName: "AlphaGo",
          primaryColor: "#0EA5E9",
          secondaryColor: "#0F172A",
          supportEmail: "support@alpha-rides.com"
        })
      }) as never
    );

    expect(response.status).toBe(200);
    expect(updateTenantBrandingMock).toHaveBeenCalledWith("tenant-a", {
      appName: "AlphaGo",
      primaryColor: "#0EA5E9",
      secondaryColor: "#0F172A",
      supportEmail: "support@alpha-rides.com"
    });
  });

  it("forbids non-super-admin from reading tenants list", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u2",
      role: "tenant_admin",
      tenantId: "tenant-a",
      tenantSlug: "alpha"
    });

    const response = await superAdminTenantsGet(new Request("http://localhost/api/super-admin/tenants") as never);

    expect(response.status).toBe(403);
    expect(tenantFindManyMock).not.toHaveBeenCalled();
  });

  it("returns tenants list to super_admin", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u3",
      role: "super_admin"
    });
    tenantFindManyMock.mockResolvedValue([{ id: "t1", name: "Alpha Rides" }]);

    const response = await superAdminTenantsGet(new Request("http://localhost/api/super-admin/tenants") as never);

    expect(response.status).toBe(200);
    expect(tenantFindManyMock).toHaveBeenCalledOnce();
    const body = await response.json();
    expect(body.data).toEqual([{ id: "t1", name: "Alpha Rides" }]);
  });

  it("enrolls a tenant when called by super_admin", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u3",
      role: "super_admin"
    });
    enrollTenantMock.mockResolvedValue({
      tenant: { id: "t3", slug: "gamma-rides", name: "Gamma Rides" },
      tenantAdmin: { id: "u7", email: "admin@gamma-rides.com", role: "tenant_admin", tenantId: "t3" }
    });

    const response = await superAdminTenantsPost(
      new Request("http://localhost/api/super-admin/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.10",
          "user-agent": "vitest"
        },
        body: JSON.stringify({
          name: "Gamma Rides",
          slug: "gamma-rides",
          adminFullName: "Gamma Admin",
          adminEmail: "admin@gamma-rides.com",
          adminPassword: "StrongPass123"
        })
      }) as never
    );

    expect(response.status).toBe(201);
    expect(enrollTenantMock).toHaveBeenCalledWith(
      {
        userId: "u3",
        role: "super_admin",
        ipAddress: "203.0.113.10",
        userAgent: "vitest"
      },
      {
        name: "Gamma Rides",
        slug: "gamma-rides",
        adminFullName: "Gamma Admin",
        adminEmail: "admin@gamma-rides.com",
        adminPassword: "StrongPass123"
      }
    );
  });

  it("forbids tenant enrollment for non-super-admin", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u2",
      role: "tenant_admin",
      tenantId: "tenant-a",
      tenantSlug: "alpha"
    });

    const response = await superAdminTenantsPost(
      new Request("http://localhost/api/super-admin/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Gamma Rides",
          slug: "gamma-rides",
          adminFullName: "Gamma Admin",
          adminEmail: "admin@gamma-rides.com",
          adminPassword: "StrongPass123"
        })
      }) as never
    );

    expect(response.status).toBe(403);
    expect(enrollTenantMock).not.toHaveBeenCalled();
  });

  it("returns 409 when enrollment has unique conflicts", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u3",
      role: "super_admin"
    });
    enrollTenantMock.mockRejectedValue(
      new AppError("Tenant slug, custom domain, or admin email already exists", 409, "resource_conflict")
    );

    const response = await superAdminTenantsPost(
      new Request("http://localhost/api/super-admin/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Gamma Rides",
          slug: "gamma-rides",
          adminFullName: "Gamma Admin",
          adminEmail: "admin@gamma-rides.com",
          adminPassword: "StrongPass123"
        })
      }) as never
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("resource_conflict");
  });

  it("updates a tenant when called by super_admin", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u3",
      role: "super_admin"
    });

    tenantFindUniqueMock.mockResolvedValue({
      id: "t1",
      name: "Alpha Rides",
      slug: "alpha-rides",
      appName: "Alpha",
      status: "active",
      supportEmail: "support@alpha.com",
      supportPhone: null,
      primaryColor: "#0D9488",
      secondaryColor: "#0F172A",
      customDomain: null,
      platformCommissionBps: 1500
    });

    tenantUpdateMock.mockResolvedValue({
      id: "t1",
      name: "Alpha Mobility",
      slug: "alpha-mobility",
      status: "active",
      supportEmail: "ops@alpha.com"
    });

    const response = await superAdminTenantPatch(
      new Request("http://localhost/api/super-admin/tenants/t1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Alpha Mobility",
          slug: "alpha-mobility",
          supportEmail: "ops@alpha.com"
        })
      }) as never,
      { params: Promise.resolve({ tenantId: "t1" }) }
    );

    expect(response.status).toBe(200);
    expect(tenantUpdateMock).toHaveBeenCalledOnce();
    expect(auditCreateMock).toHaveBeenCalledOnce();
  });

  it("forbids tenant update for non-super-admin", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u2",
      role: "tenant_admin",
      tenantId: "tenant-a",
      tenantSlug: "alpha"
    });

    const response = await superAdminTenantPatch(
      new Request("http://localhost/api/super-admin/tenants/t1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "New Name" })
      }) as never,
      { params: Promise.resolve({ tenantId: "t1" }) }
    );

    expect(response.status).toBe(403);
    expect(tenantUpdateMock).not.toHaveBeenCalled();
  });

  it("returns tenant insights to super_admin", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u3",
      role: "super_admin"
    });

    tenantFindUniqueMock.mockResolvedValue({
      id: "t1",
      name: "Alpha Rides",
      slug: "alpha-rides",
      appName: "Alpha",
      status: "active",
      supportEmail: "support@alpha.com",
      supportPhone: null,
      customDomain: null,
      platformCommissionBps: 1500,
      primaryColor: "#0D9488",
      secondaryColor: "#0F172A",
      createdAt: new Date().toISOString(),
      _count: {
        users: 10,
        riders: 4,
        passengers: 5,
        trips: 120,
        transactions: 98,
        complaints: 2
      }
    });
    riderFindManyMock.mockResolvedValue([{ id: "r1" }]);
    passengerFindManyMock.mockResolvedValue([{ id: "p1" }]);
    tripFindManyMock.mockResolvedValue([{ id: "tr1" }]);
    paymentFindManyMock.mockResolvedValue([{ id: "tx1" }]);
    userFindManyMock.mockResolvedValue([{ id: "u-admin-1" }]);

    const response = await superAdminTenantInsightsGet(
      new Request("http://localhost/api/super-admin/tenants/t1/insights", {
        method: "GET"
      }) as never,
      { params: Promise.resolve({ tenantId: "t1" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.tenant.id).toBe("t1");
    expect(body.data.tenantAdmins).toEqual([{ id: "u-admin-1" }]);
    expect(body.data.riders).toEqual([{ id: "r1" }]);
    expect(body.data.passengers).toEqual([{ id: "p1" }]);
    expect(body.data.tripHistory).toEqual([{ id: "tr1" }]);
    expect(body.data.transactions).toEqual([{ id: "tx1" }]);
  });

  it("forbids tenant insights for non-super-admin", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u2",
      role: "tenant_admin",
      tenantId: "tenant-a",
      tenantSlug: "alpha"
    });

    const response = await superAdminTenantInsightsGet(
      new Request("http://localhost/api/super-admin/tenants/t1/insights", {
        method: "GET"
      }) as never,
      { params: Promise.resolve({ tenantId: "t1" }) }
    );

    expect(response.status).toBe(403);
    expect(tenantFindUniqueMock).not.toHaveBeenCalled();
  });

  it("updates tenant admin credentials when called by super_admin", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u3",
      role: "super_admin"
    });

    userFindFirstMock.mockResolvedValue({
      id: "u-admin-1",
      email: "old-admin@alpha.com",
      fullName: "Alpha Admin",
      role: "tenant_admin",
      status: "active"
    });
    userUpdateMock.mockResolvedValue({
      id: "u-admin-1",
      email: "new-admin@alpha.com",
      fullName: "Alpha Admin",
      role: "tenant_admin",
      status: "active",
      updatedAt: new Date().toISOString()
    });

    const response = await superAdminTenantCredentialsPatch(
      new Request("http://localhost/api/super-admin/tenants/t1/credentials", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adminUserId: "u-admin-1",
          email: "new-admin@alpha.com",
          newPassword: "StrongerPass123"
        })
      }) as never,
      { params: Promise.resolve({ tenantId: "t1" }) }
    );

    expect(response.status).toBe(200);
    expect(userUpdateMock).toHaveBeenCalledOnce();
    expect(auditCreateMock).toHaveBeenCalledOnce();
  });

  it("forbids tenant admin credential update for non-super-admin", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u2",
      role: "tenant_admin",
      tenantId: "tenant-a",
      tenantSlug: "alpha"
    });

    const response = await superAdminTenantCredentialsPatch(
      new Request("http://localhost/api/super-admin/tenants/t1/credentials", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adminUserId: "u-admin-1",
          email: "new-admin@alpha.com"
        })
      }) as never,
      { params: Promise.resolve({ tenantId: "t1" }) }
    );

    expect(response.status).toBe(403);
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});
