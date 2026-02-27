import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors/app-error";
import { POST as loginPost } from "@/app/(public)/api/auth/login/route";
import { POST as refreshPost } from "@/app/(public)/api/auth/refresh/route";
import { PATCH as tenantBrandingPatch } from "@/app/(public)/api/tenant/branding/route";
import { GET as superAdminTenantsGet, POST as superAdminTenantsPost } from "@/app/(public)/api/super-admin/tenants/route";

const {
  loginMock,
  refreshMock,
  rateLimitMock,
  getAuthContextMock,
  updateTenantBrandingMock,
  tenantFindManyMock,
  enrollTenantMock
} = vi.hoisted(() => ({
  loginMock: vi.fn(),
  refreshMock: vi.fn(),
  rateLimitMock: vi.fn(),
  getAuthContextMock: vi.fn(),
  updateTenantBrandingMock: vi.fn(),
  tenantFindManyMock: vi.fn(),
  enrollTenantMock: vi.fn()
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
      findMany: tenantFindManyMock
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
});
