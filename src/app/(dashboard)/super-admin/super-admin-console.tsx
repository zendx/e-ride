"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/password-field";
import { clearClientSession, getRoleFromAccessToken, getStoredAccessToken } from "@/lib/auth/client-session";

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
  supportPhone: string | null;
  customDomain: string | null;
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  platformCommissionBps: number;
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
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [streamState, setStreamState] = useState<"connecting" | "live" | "fallback">("connecting");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [profileFormInitialized, setProfileFormInitialized] = useState(false);

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

  const loadDashboard = useCallback(async (rawToken: string, options?: { silent?: boolean; syncProfileForm?: boolean }) => {
    const token = normalizeToken(rawToken);
    if (!token) {
      setSessionReady(false);
      setOverview(null);
      setTenants([]);
      setProfile(null);
      setAdminUsers([]);
      clearClientSession();
      router.replace("/super-admin/login");
      return;
    }

    if (!options?.silent) setLoading(true);
    setError("");

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
        setSessionReady(false);
        setOverview(null);
        setTenants([]);
        setProfile(null);
        setAdminUsers([]);
        setError("Session expired or unauthorized. Please log in again.");
        clearClientSession();
        router.replace("/super-admin/login");
        return;
      }

      const failed = results.find((result) => !result.response.ok);
      if (failed && failed.request.key !== "overview") {
        const body = failed.body as ErrorResponse | null;
        const message = body?.error?.message ?? `Request failed (${failed.response.status})`;
        setError(`Failed to load ${failed.request.key}: ${message}`);
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
        if (options?.syncProfileForm || !profileFormInitialized) {
          setProfileForm((current) => ({ ...current, fullName: data.fullName, email: data.email }));
          setProfileFormInitialized(true);
        }
      }

      const adminUsersResult = results.find((result) => result.request.key === "admin-users" && result.response.ok);
      if (adminUsersResult?.body && typeof adminUsersResult.body === "object" && "data" in adminUsersResult.body) {
        setAdminUsers((adminUsersResult.body as { data: AdminUser[] }).data);
      }
    } catch {
      setError("Network error while loading super-admin data.");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [profileFormInitialized, router]);

  useEffect(() => {
    const storedToken = getStoredAccessToken();
    if (!storedToken) {
      setSessionReady(false);
      router.replace("/super-admin/login");
      return;
    }

    const role = getRoleFromAccessToken(storedToken);
    if (role !== "super_admin") {
      setSessionReady(false);
      clearClientSession();
      router.replace("/super-admin/login");
      return;
    }

    setAccessToken(storedToken);
    setSessionReady(true);
    void loadDashboard(storedToken, { syncProfileForm: true });
  }, [loadDashboard, router]);

  useEffect(() => {
    if (!accessToken.trim() || !autoRefreshEnabled) return;
    setStreamState("connecting");
  }, [accessToken, autoRefreshEnabled]);

  useEffect(() => {
    const token = normalizeToken(accessToken);
    if (!token || !autoRefreshEnabled || streamState === "fallback") return;

    const eventSource = new EventSource(`/api/super-admin/dashboard/stream?accessToken=${encodeURIComponent(token)}`);
    let closed = false;

    const handleReady = () => {
      setStreamState("live");
      void loadDashboard(token, { silent: true });
    };
    const handleUpdate = () => {
      void loadDashboard(token, { silent: true });
    };

    eventSource.addEventListener("ready", handleReady);
    eventSource.addEventListener("superadmin_event", handleUpdate);
    eventSource.onerror = () => {
      if (closed) return;
      setStreamState("fallback");
      eventSource.close();
    };

    return () => {
      closed = true;
      eventSource.removeEventListener("ready", handleReady);
      eventSource.removeEventListener("superadmin_event", handleUpdate);
      eventSource.close();
    };
  }, [accessToken, autoRefreshEnabled, loadDashboard, streamState]);

  useEffect(() => {
    const token = normalizeToken(accessToken);
    if (!token || !autoRefreshEnabled || streamState !== "fallback") return;

    void loadDashboard(token, { silent: true });
    const interval = setInterval(() => {
      void loadDashboard(token, { silent: true });
    }, 15000);

    return () => clearInterval(interval);
  }, [accessToken, autoRefreshEnabled, loadDashboard, streamState]);

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
      setProfileFormInitialized(false);
      await loadDashboard(token, { silent: true, syncProfileForm: true });
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
      await loadDashboard(token, { silent: true });
    } catch {
      setAdminResult({ ok: false, message: "Network error while creating admin user." });
    }
  }

  if (!sessionReady) {
    return (
      <div className="alert alert-warning mb-0">Redirecting to login...</div>
    );
  }

  return (
    <section>
      <p className="text-body-secondary mb-3">Platform controls for tenants, administrators, and operational oversight.</p>
      <p className="muted">
        {!autoRefreshEnabled
          ? "Auto-refresh is off. Use Refresh to load the latest data."
          : streamState === "live"
          ? "Live updates via SSE stream."
          : streamState === "connecting"
            ? "Connecting to live stream..."
            : "Stream unavailable. Using 15s polling fallback."}
      </p>
      <div className="toolbar">
        <button type="button" className="btn btn-outline-default btn-sm" onClick={() => void loadDashboard(accessToken)} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
        <button type="button" className="btn btn-outline-default btn-sm" onClick={() => setAutoRefreshEnabled((current) => !current)}>
          {autoRefreshEnabled ? "Auto-refresh: On" : "Auto-refresh: Off"}
        </button>
        <button type="button" className="btn btn-outline-default btn-sm" onClick={() => router.push("/super-admin/enroll")}>
          Enroll Tenant
        </button>
        <button
          type="button"
          className="btn btn-outline-default btn-sm"
          onClick={() => {
            clearClientSession();
            setAccessToken("");
            setOverview(null);
            setTenants([]);
            setProfile(null);
            setAdminUsers([]);
            setError("");
            router.push("/super-admin/login");
          }}
        >
          Logout
        </button>
      </div>

      {error ? <p className="status-error">{error}</p> : null}

      {overview ? (
        <div className="row">
          <div className="col-xl-6 mb-3">
            <div className="card h-100 overflow-hidden">
              <div
                className="card-img-overlay d-none d-md-block bg-blue rounded mb-n1 mx-n1"
                style={{
                  backgroundImage: "url(/studio/assets/img/bg/wave-bg.png)",
                  backgroundPosition: "right bottom",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "100%"
                }}
              ></div>
              <div className="card-img-overlay d-none d-md-block bottom-0 top-auto">
                <div className="row">
                  <div className="col-md-8 col-xl-6"></div>
                  <div className="col-md-4 col-xl-6 mb-n2">
                    <img src="/studio/assets/img/page/dashboard.svg" alt="" className="d-block ms-n3 mb-5" style={{ maxHeight: 280 }} />
                  </div>
                </div>
              </div>
              <div className="card-body position-relative text-white text-opacity-70">
                <div className="row">
                  <div className="col-md-8">
                    <div className="d-flex">
                      <div className="me-auto">
                        <h5 className="text-white text-opacity-80 mb-3">Platform Snapshot</h5>
                        <h3 className="text-white mt-n1 mb-1">{overview.tenantCount} Tenants</h3>
                        <p className="mb-1 text-white text-opacity-60 text-truncate">
                          <i className="fa fa-caret-up"></i> Super admin overview
                        </p>
                      </div>
                    </div>
                    <hr className="bg-white bg-opacity-75 mt-3 mb-3" />
                    <div className="row">
                      <div className="col-6 col-lg-5">
                        <div className="mt-1">
                          <i className="fa fa-fw fa-id-card fs-28px text-black text-opacity-50"></i>
                        </div>
                        <div className="mt-1">
                          <div>Pending KYC</div>
                          <div className="fw-600 text-white">{overview.pendingKycCount}</div>
                        </div>
                      </div>
                      <div className="col-6 col-lg-5">
                        <div className="mt-1">
                          <i className="fa fa-fw fa-route fs-28px text-black text-opacity-50"></i>
                        </div>
                        <div className="mt-1">
                          <div>Active Trips</div>
                          <div className="fw-600 text-white">{overview.activeTripCount}</div>
                        </div>
                      </div>
                    </div>
                    <hr className="bg-white bg-opacity-75 mt-3 mb-3" />
                    <div className="mt-3 mb-2">
                      <button type="button" className="btn btn-yellow btn-rounded btn-sm ps-5 pe-5 pt-2 pb-2 fs-14px fw-600" onClick={() => router.push("/super-admin/enroll")}>
                        <i className="fa fa-plus me-2 ms-n2"></i> Enroll tenant
                      </button>
                    </div>
                    <p className="fs-12px">Review tenants, open complaints and admin assignments from one panel.</p>
                  </div>
                  <div className="col-md-4 d-none d-md-block" style={{ minHeight: 320 }}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-6">
            <div className="row">
              <div className="col-sm-6">
                <div className="card mb-3 overflow-hidden fs-13px border-0 bg-gradient-custom-orange" style={{ minHeight: 199 }}>
                  <div className="card-img-overlay mb-n4 me-n4 d-flex" style={{ bottom: 0, top: "auto" }}>
                    <img src="/studio/assets/img/icon/order.svg" alt="" className="ms-auto d-block mb-n3" style={{ maxHeight: 105 }} />
                  </div>
                  <div className="card-body position-relative">
                    <h5 className="text-white text-opacity-80 mb-3 fs-16px">Total Tenants</h5>
                    <h3 className="text-white mt-n1">{overview.tenantCount}</h3>
                  </div>
                </div>
                <div className="card mb-3 overflow-hidden fs-13px border-0 bg-gradient-custom-teal" style={{ minHeight: 199 }}>
                  <div className="card-img-overlay mb-n4 me-n4 d-flex" style={{ bottom: 0, top: "auto" }}>
                    <img src="/studio/assets/img/icon/visitor.svg" alt="" className="ms-auto d-block mb-n3" style={{ maxHeight: 105 }} />
                  </div>
                  <div className="card-body position-relative">
                    <h5 className="text-white text-opacity-80 mb-3 fs-16px">Pending KYC</h5>
                    <h3 className="text-white mt-n1">{overview.pendingKycCount}</h3>
                  </div>
                </div>
              </div>
              <div className="col-sm-6">
                <div className="card mb-3 overflow-hidden fs-13px border-0 bg-gradient-custom-pink" style={{ minHeight: 199 }}>
                  <div className="card-img-overlay mb-n4 me-n4 d-flex" style={{ bottom: 0, top: "auto" }}>
                    <img src="/studio/assets/img/icon/email.svg" alt="" className="ms-auto d-block mb-n3" style={{ maxHeight: 105 }} />
                  </div>
                  <div className="card-body position-relative">
                    <h5 className="text-white text-opacity-80 mb-3 fs-16px">Active Trips</h5>
                    <h3 className="text-white mt-n1">{overview.activeTripCount}</h3>
                  </div>
                </div>
                <div className="card mb-3 overflow-hidden fs-13px border-0 bg-gradient-custom-indigo" style={{ minHeight: 199 }}>
                  <div className="card-img-overlay mb-n4 me-n4 d-flex" style={{ bottom: 0, top: "auto" }}>
                    <img src="/studio/assets/img/icon/browser.svg" alt="" className="ms-auto d-block mb-n3" style={{ maxHeight: 105 }} />
                  </div>
                  <div className="card-body position-relative">
                    <h5 className="text-white text-opacity-80 mb-3 fs-16px">Open Complaints</h5>
                    <h3 className="text-white mt-n1">{overview.openComplaintCount}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="card section">
        <h2>My Profile</h2>
        <form className="form-grid" onSubmit={submitProfile}>
          <label className="form-label">
            Full Name
            <input
              className="form-control"
              value={profileForm.fullName}
              onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })}
            />
          </label>
          <label className="form-label">
            Email
            <input
              className="form-control"
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
            />
          </label>
          <label className="form-label">
            Current Password (required to change password)
            <PasswordField
              className="form-control"
              value={profileForm.currentPassword}
              onChange={(event) => setProfileForm({ ...profileForm, currentPassword: event.target.value })}
            />
          </label>
          <label className="form-label">
            New Password
            <PasswordField
              className="form-control"
              value={profileForm.newPassword}
              onChange={(event) => setProfileForm({ ...profileForm, newPassword: event.target.value })}
            />
          </label>
          <button type="submit" className="btn btn-outline-theme fw-500">Save Profile</button>
        </form>
        {profile ? <p className="muted">Role: {profile.role}</p> : null}
        {profileResult ? <p className={profileResult.ok ? "status-ok" : "status-error"}>{profileResult.message}</p> : null}
      </section>

      <section className="card section">
        <h2>Assign Administrators</h2>
        <p className="muted">Role levels: super_admin (full control), support (operations/support access).</p>
        <form className="form-grid" onSubmit={submitAdminUser}>
          <label className="form-label">
            Full Name
            <input
              className="form-control"
              value={adminForm.fullName}
              onChange={(event) => setAdminForm({ ...adminForm, fullName: event.target.value })}
            />
          </label>
          <label className="form-label">
            Email
            <input
              className="form-control"
              type="email"
              value={adminForm.email}
              onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })}
            />
          </label>
          <label className="form-label">
            Temporary Password
            <PasswordField
              className="form-control"
              value={adminForm.password}
              onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })}
            />
          </label>
          <label className="form-label">
            Role Level
            <select
              className="form-select"
              value={adminForm.role}
              onChange={(event) => setAdminForm({ ...adminForm, role: event.target.value as "support" | "super_admin" })}
            >
              <option value="support">support</option>
              <option value="super_admin">super_admin</option>
            </select>
          </label>
          <button type="submit" className="btn btn-outline-theme fw-500">Create Admin</button>
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
        <p className="muted">Use the view icon to open tenant profile, activity, and edit controls.</p>
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
              <th>View</th>
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
                <td>
                  <button
                    type="button"
                    onClick={() => router.push(`/super-admin/tenants/${tenant.id}`)}
                    aria-label={`View ${tenant.name}`}
                    title="View tenant"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path
                        d="M2 12c.6-1.2 4.5-7 10-7s9.4 5.8 10 7c-.6 1.2-4.5 7-10 7S2.6 13.2 2 12z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
