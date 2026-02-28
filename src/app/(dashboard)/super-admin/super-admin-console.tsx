"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/app/login-form";
import { PasswordField } from "@/components/password-field";

type AdminRole = "super_admin" | "support";

type SuperAdminOverview = {
  tenantCount: number;
  pendingKycCount: number;
  activeTripCount: number;
  openComplaintCount: number;
};

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  supportEmail: string | null;
  createdAt: string;
  _count: {
    users: number;
    trips: number;
    complaints: number;
    tenantKycDocuments: number;
  };
};

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type Profile = {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  createdAt: string;
  updatedAt: string;
};

type ErrorResponse = {
  error?: { message?: string };
};

function normalizeToken(token: string) {
  return token.trim().replace(/^Bearer\s+/i, "");
}

export function SuperAdminConsole() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    currentPassword: "",
    newPassword: ""
  });
  const [profileResult, setProfileResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [adminForm, setAdminForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "support" as "support" | "super_admin"
  });
  const [adminResult, setAdminResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loadDashboard = useCallback(async (rawToken: string) => {
    const token = normalizeToken(rawToken);
    if (!token) {
      setAuthenticated(false);
      setOverview(null);
      setTenants([]);
      setProfile(null);
      setAdminUsers([]);
      return;
    }

    setLoading(true);
    setError("");
    setAuthenticated(true);

    try {
      const headers = { authorization: `Bearer ${token}` };
      const requests = [
        { key: "overview", url: "/api/super-admin/overview" },
        { key: "tenants", url: "/api/super-admin/tenants" },
        { key: "profile", url: "/api/super-admin/profile" },
        { key: "admin-users", url: "/api/super-admin/admin-users" }
      ] as const;

      const results = await Promise.all(requests.map(async (request) => {
        const response = await fetch(request.url, { headers });
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }
        return { request, response, body };
      }));

      const authFailure = results.find((result) => result.response.status === 401 || result.response.status === 403);
      if (authFailure) {
        setAuthenticated(false);
        setOverview(null);
        setTenants([]);
        setProfile(null);
        setAdminUsers([]);
        setError("Session expired or unauthorized. Please log in again.");
        return;
      }

      const failed = results.find((result) => !result.response.ok);
      if (failed) {
        if (failed.request.key !== "overview") {
          const body = failed.body as ErrorResponse | null;
          const message = body?.error?.message ?? `Request failed (${failed.response.status})`;
          setError(`Failed to load ${failed.request.key}: ${message}`);
        }
      }

      const overviewResult = results.find((result) => result.request.key === "overview" && result.response.ok);
      if (overviewResult?.body && typeof overviewResult.body === "object" && "data" in overviewResult.body) {
        setOverview((overviewResult.body as { data: SuperAdminOverview }).data);
      } else {
        setOverview({
          tenantCount: 0,
          pendingKycCount: 0,
          activeTripCount: 0,
          openComplaintCount: 0
        });
      }

      const tenantsResult = results.find((result) => result.request.key === "tenants" && result.response.ok);
      if (tenantsResult?.body && typeof tenantsResult.body === "object" && "data" in tenantsResult.body) {
        setTenants((tenantsResult.body as { data: TenantRow[] }).data);
      }

      const profileResult = results.find((result) => result.request.key === "profile" && result.response.ok);
      if (profileResult?.body && typeof profileResult.body === "object" && "data" in profileResult.body) {
        const data = (profileResult.body as { data: Profile }).data;
        setProfile(data);
        setProfileForm((current) => ({ ...current, fullName: data.fullName, email: data.email }));
      }

      const adminUsersResult = results.find((result) => result.request.key === "admin-users" && result.response.ok);
      if (adminUsersResult?.body && typeof adminUsersResult.body === "object" && "data" in adminUsersResult.body) {
        setAdminUsers((adminUsersResult.body as { data: AdminUser[] }).data);
      }

      localStorage.setItem("carrygo_access_token", token);
    } catch {
      setError("Network error while loading super-admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("carrygo_access_token");
    if (!storedToken) return;
    setAccessToken(storedToken);
    void loadDashboard(storedToken);
  }, [loadDashboard]);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileResult(null);

    const token = normalizeToken(accessToken);
    if (!token) return;

    const payload: Record<string, string> = {};
    if (profileForm.fullName.trim()) payload.fullName = profileForm.fullName.trim();
    if (profileForm.email.trim()) payload.email = profileForm.email.trim().toLowerCase();
    if (profileForm.newPassword.trim()) {
      payload.newPassword = profileForm.newPassword.trim();
      payload.currentPassword = profileForm.currentPassword;
    }

    try {
      const response = await fetch("/api/super-admin/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = (await response.json()) as ErrorResponse;
        setProfileResult({ ok: false, message: body.error?.message ?? `Profile update failed (${response.status}).` });
        return;
      }

      setProfileForm((current) => ({ ...current, currentPassword: "", newPassword: "" }));
      setProfileResult({ ok: true, message: "Profile updated successfully." });
      await loadDashboard(token);
    } catch {
      setProfileResult({ ok: false, message: "Network error while updating profile." });
    }
  }

  async function submitAdminUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminResult(null);

    const token = normalizeToken(accessToken);
    if (!token) return;

    try {
      const response = await fetch("/api/super-admin/admin-users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: adminForm.fullName,
          email: adminForm.email,
          password: adminForm.password,
          role: adminForm.role
        })
      });

      if (!response.ok) {
        const body = (await response.json()) as ErrorResponse;
        setAdminResult({ ok: false, message: body.error?.message ?? `Failed to create admin (${response.status}).` });
        return;
      }

      setAdminForm({ fullName: "", email: "", password: "", role: "support" });
      setAdminResult({ ok: true, message: "Admin user created successfully." });
      await loadDashboard(token);
    } catch {
      setAdminResult({ ok: false, message: "Network error while creating admin user." });
    }
  }

  if (!authenticated) {
    return (
      <main className="container">
        <h1>CarryGo Super Admin</h1>
        <p className="page-subtitle">Login is required before viewing super-admin operations.</p>
        <LoginForm
          onLoginSuccess={(payload) => {
            if (payload.user.role !== "super_admin") {
              setAuthenticated(false);
              setOverview(null);
              setTenants([]);
              setProfile(null);
              setAdminUsers([]);
              setError("This account is not a super admin.");
              return;
            }

            setAccessToken(payload.accessToken);
            void loadDashboard(payload.accessToken);
          }}
        />
        {loading ? <p className="muted">Loading dashboard...</p> : null}
        {error ? <p className="status-error">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="container">
      <h1>CarryGo Super Admin</h1>
      <p className="page-subtitle">Platform controls for tenants, administrators, and operational oversight.</p>
      <div className="toolbar">
        <button type="button" onClick={() => void loadDashboard(accessToken)} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
        <button type="button" onClick={() => router.push("/super-admin/enroll")}>
          Enroll Tenant
        </button>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("carrygo_access_token");
            localStorage.removeItem("carrygo_refresh_token");
            setAccessToken("");
            setAuthenticated(false);
            setOverview(null);
            setTenants([]);
            setProfile(null);
            setAdminUsers([]);
            setError("");
          }}
        >
          Logout
        </button>
      </div>

      {error ? <p className="status-error">{error}</p> : null}

      {overview ? (
        <div className="grid">
          <div className="card"><strong>Tenants</strong><p>{overview.tenantCount}</p></div>
          <div className="card"><strong>Pending KYC</strong><p>{overview.pendingKycCount}</p></div>
          <div className="card"><strong>Active Trips</strong><p>{overview.activeTripCount}</p></div>
          <div className="card"><strong>Open Complaints</strong><p>{overview.openComplaintCount}</p></div>
        </div>
      ) : null}

      <section className="card section">
        <h2>My Profile</h2>
        <form className="form-grid" onSubmit={submitProfile}>
          <label>
            Full Name
            <input
              value={profileForm.fullName}
              onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
            />
          </label>
          <label>
            Current Password (required to change password)
            <PasswordField
              value={profileForm.currentPassword}
              onChange={(event) => setProfileForm({ ...profileForm, currentPassword: event.target.value })}
            />
          </label>
          <label>
            New Password
            <PasswordField
              value={profileForm.newPassword}
              onChange={(event) => setProfileForm({ ...profileForm, newPassword: event.target.value })}
            />
          </label>
          <button type="submit">Save Profile</button>
        </form>
        {profile ? <p className="muted">Role: {profile.role}</p> : null}
        {profileResult ? <p className={profileResult.ok ? "status-ok" : "status-error"}>{profileResult.message}</p> : null}
      </section>

      <section className="card section">
        <h2>Assign Administrators</h2>
        <p className="muted">Role levels: super_admin (full control), support (operations/support access).</p>
        <form className="form-grid" onSubmit={submitAdminUser}>
          <label>
            Full Name
            <input
              value={adminForm.fullName}
              onChange={(event) => setAdminForm({ ...adminForm, fullName: event.target.value })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={adminForm.email}
              onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })}
            />
          </label>
          <label>
            Temporary Password
            <PasswordField
              value={adminForm.password}
              onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })}
            />
          </label>
          <label>
            Role Level
            <select
              value={adminForm.role}
              onChange={(event) => setAdminForm({ ...adminForm, role: event.target.value as "support" | "super_admin" })}
            >
              <option value="support">support</option>
              <option value="super_admin">super_admin</option>
            </select>
          </label>
          <button type="submit">Create Admin</button>
        </form>
        {adminResult ? <p className={adminResult.ok ? "status-ok" : "status-error"}>{adminResult.message}</p> : null}

        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {adminUsers.map((admin) => (
              <tr key={admin.id}>
                <td>{admin.fullName}</td>
                <td>{admin.email}</td>
                <td>{admin.role}</td>
                <td>{admin.status}</td>
                <td>{new Date(admin.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card section">
        <h2>Tenants</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Users</th>
              <th>Trips</th>
              <th>Complaints</th>
              <th>Support Email</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>{tenant.name}</td>
                <td>{tenant.slug}</td>
                <td>{tenant.status}</td>
                <td>{tenant._count.users}</td>
                <td>{tenant._count.trips}</td>
                <td>{tenant._count.complaints}</td>
                <td>{tenant.supportEmail ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
