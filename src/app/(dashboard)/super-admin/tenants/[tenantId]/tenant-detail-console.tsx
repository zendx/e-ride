"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/password-field";
import { clearClientSession, getRoleFromAccessToken, getStoredAccessToken } from "@/lib/auth/client-session";

type ErrorResponse = {
  error?: { message?: string };
};

type TenantInsights = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    appName: string;
    status: string;
    supportEmail: string | null;
    supportPhone: string | null;
    customDomain: string | null;
    platformCommissionBps: number;
    primaryColor: string;
    secondaryColor: string;
    createdAt: string;
    _count: {
      users: number;
      riders: number;
      passengers: number;
      trips: number;
      transactions: number;
      complaints: number;
    };
  };
  tenantAdmins: Array<{
    id: string;
    fullName: string;
    email: string;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
  }>;
  riders: Array<{
    id: string;
    availability: string;
    totalTrips: number;
    vehicleType: string;
    vehiclePlate: string;
    user: { fullName: string; email: string; status: string };
  }>;
  passengers: Array<{
    id: string;
    walletBalanceMinor: string | number;
    user: { fullName: string; email: string; status: string };
    _count: { trips: number };
  }>;
  tripHistory: Array<{
    id: string;
    status: string;
    fareTotalMinor: number;
    requestedAt: string;
    rider: { user: { fullName: string } } | null;
    passenger: { user: { fullName: string } } | null;
  }>;
  transactions: Array<{
    id: string;
    tripId: string;
    method: string;
    status: string;
    amountMinor: number;
    createdAt: string;
  }>;
};

function normalizeToken(token: string) {
  return token.trim().replace(/^Bearer\s+/i, "");
}

export function TenantDetailConsole({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [streamState, setStreamState] = useState<"connecting" | "live" | "fallback">("connecting");
  const [insights, setInsights] = useState<TenantInsights | null>(null);
  const [tenantResult, setTenantResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [credentialsResult, setCredentialsResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [tenantForm, setTenantForm] = useState({
    name: "",
    slug: "",
    status: "",
    appName: "",
    supportEmail: "",
    supportPhone: "",
    customDomain: "",
    primaryColor: "#0D9488",
    secondaryColor: "#0F172A",
    platformCommissionBps: 1500
  });
  const [credentialsForm, setCredentialsForm] = useState({
    adminUserId: "",
    email: "",
    newPassword: ""
  });

  const loadInsights = useCallback(async (rawToken: string) => {
    const token = normalizeToken(rawToken);
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}/insights?peopleLimit=25&historyLimit=50`, {
        headers: { authorization: `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        clearClientSession();
        router.replace("/super-admin/login");
        return;
      }

      if (!response.ok) {
        const body = (await response.json()) as ErrorResponse;
        setError(body.error?.message ?? `Failed to load tenant insights (${response.status})`);
        setInsights(null);
        return;
      }

      const body = (await response.json()) as { data: TenantInsights };
      setInsights(body.data);
      setTenantForm({
        name: body.data.tenant.name,
        slug: body.data.tenant.slug,
        status: body.data.tenant.status,
        appName: body.data.tenant.appName,
        supportEmail: body.data.tenant.supportEmail ?? "",
        supportPhone: body.data.tenant.supportPhone ?? "",
        customDomain: body.data.tenant.customDomain ?? "",
        primaryColor: body.data.tenant.primaryColor,
        secondaryColor: body.data.tenant.secondaryColor,
        platformCommissionBps: body.data.tenant.platformCommissionBps
      });
      const selectedAdmin = body.data.tenantAdmins[0];
      setCredentialsForm({
        adminUserId: selectedAdmin?.id ?? "",
        email: selectedAdmin?.email ?? "",
        newPassword: ""
      });
    } catch {
      setError("Network error while loading tenant details.");
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, [router, tenantId]);

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
    void loadInsights(storedToken);
  }, [loadInsights, router]);

  useEffect(() => {
    if (!accessToken.trim()) return;
    setStreamState("connecting");
  }, [accessToken, tenantId]);

  useEffect(() => {
    const token = normalizeToken(accessToken);
    if (!token || streamState === "fallback") return;

    const eventSource = new EventSource(`/api/super-admin/tenants/${tenantId}/stream?accessToken=${encodeURIComponent(token)}`);
    let closed = false;

    const handleReady = () => {
      setStreamState("live");
      void loadInsights(token);
    };
    const handleUpdate = () => {
      void loadInsights(token);
    };

    eventSource.addEventListener("ready", handleReady);
    eventSource.addEventListener("tenant_event", handleUpdate);
    eventSource.onerror = () => {
      if (closed) return;
      setStreamState("fallback");
      eventSource.close();
    };

    return () => {
      closed = true;
      eventSource.removeEventListener("ready", handleReady);
      eventSource.removeEventListener("tenant_event", handleUpdate);
      eventSource.close();
    };
  }, [accessToken, loadInsights, streamState, tenantId]);

  useEffect(() => {
    const token = normalizeToken(accessToken);
    if (!token || streamState !== "fallback") return;

    void loadInsights(token);
    const interval = setInterval(() => {
      void loadInsights(token);
    }, 15000);

    return () => clearInterval(interval);
  }, [accessToken, loadInsights, streamState]);

  async function submitTenantUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTenantResult(null);

    const token = normalizeToken(accessToken);
    if (!token) return;

    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: tenantForm.name.trim(),
          slug: tenantForm.slug.trim().toLowerCase(),
          status: tenantForm.status.trim().toLowerCase(),
          appName: tenantForm.appName.trim(),
          supportEmail: tenantForm.supportEmail.trim() || null,
          supportPhone: tenantForm.supportPhone.trim() || null,
          customDomain: tenantForm.customDomain.trim().toLowerCase() || null,
          primaryColor: tenantForm.primaryColor.trim(),
          secondaryColor: tenantForm.secondaryColor.trim(),
          platformCommissionBps: Number(tenantForm.platformCommissionBps)
        })
      });

      if (!response.ok) {
        const body = (await response.json()) as ErrorResponse;
        setTenantResult({ ok: false, message: body.error?.message ?? `Tenant update failed (${response.status}).` });
        return;
      }

      setTenantResult({ ok: true, message: "Tenant updated successfully." });
      await loadInsights(token);
    } catch {
      setTenantResult({ ok: false, message: "Network error while updating tenant." });
    }
  }

  async function submitCredentialsUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCredentialsResult(null);

    const token = normalizeToken(accessToken);
    if (!token || !credentialsForm.adminUserId) return;

    const payload: Record<string, string> = {
      adminUserId: credentialsForm.adminUserId
    };
    if (credentialsForm.email.trim()) payload.email = credentialsForm.email.trim();
    if (credentialsForm.newPassword.trim()) payload.newPassword = credentialsForm.newPassword;

    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}/credentials`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = (await response.json()) as ErrorResponse;
        setCredentialsResult({ ok: false, message: body.error?.message ?? `Credentials update failed (${response.status}).` });
        return;
      }

      setCredentialsResult({ ok: true, message: "Tenant admin credentials updated successfully." });
      setCredentialsForm((current) => ({ ...current, newPassword: "" }));
      await loadInsights(token);
    } catch {
      setCredentialsResult({ ok: false, message: "Network error while updating credentials." });
    }
  }

  if (!sessionReady) {
    return (
      <main className="container">
        <p className="muted">Redirecting to login...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Tenant Detail</h1>
      <p className="page-subtitle">View and edit tenant profile, riders, passengers, trips, and transactions.</p>
      <p className="muted">
        {streamState === "live"
          ? "Live updates via SSE stream."
          : streamState === "connecting"
            ? "Connecting to live stream..."
            : "Stream unavailable. Using 15s polling fallback."}
      </p>

      <div className="toolbar">
        <button type="button" onClick={() => void loadInsights(accessToken)} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
        <Link href="/super-admin">Back to Super Admin</Link>
      </div>

      {error ? <p className="status-error">{error}</p> : null}
      {insights ? (
        <>
          <section className="card section">
            <h2>Tenant Admin Login Credentials</h2>
            <form className="form-grid" onSubmit={submitCredentialsUpdate}>
              <label>
                Tenant Admin Account
                <select
                  value={credentialsForm.adminUserId}
                  onChange={(event) => {
                    const admin = insights.tenantAdmins.find((item) => item.id === event.target.value);
                    setCredentialsForm({
                      adminUserId: event.target.value,
                      email: admin?.email ?? "",
                      newPassword: ""
                    });
                  }}
                  disabled={!insights.tenantAdmins.length}
                >
                  {insights.tenantAdmins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.fullName} ({admin.email})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Login Email
                <input
                  type="email"
                  value={credentialsForm.email}
                  onChange={(event) => setCredentialsForm({ ...credentialsForm, email: event.target.value })}
                  disabled={!credentialsForm.adminUserId}
                />
              </label>
              <label>
                New Password
                <PasswordField
                  value={credentialsForm.newPassword}
                  onChange={(event) => setCredentialsForm({ ...credentialsForm, newPassword: event.target.value })}
                  placeholder="Leave blank to keep current password"
                  disabled={!credentialsForm.adminUserId}
                />
              </label>
              <button type="submit" disabled={!credentialsForm.adminUserId}>Save Credentials</button>
            </form>
            {!insights.tenantAdmins.length ? <p className="muted">No tenant admin account found for this tenant.</p> : null}
            {credentialsResult ? <p className={credentialsResult.ok ? "status-ok" : "status-error"}>{credentialsResult.message}</p> : null}
          </section>

          <section className="card section">
            <h2>Edit Tenant</h2>
            <form className="form-grid" onSubmit={submitTenantUpdate}>
              <label>Name<input value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} /></label>
              <label>Slug<input value={tenantForm.slug} onChange={(e) => setTenantForm({ ...tenantForm, slug: e.target.value })} /></label>
              <label>Status<input value={tenantForm.status} onChange={(e) => setTenantForm({ ...tenantForm, status: e.target.value })} /></label>
              <label>App Name<input value={tenantForm.appName} onChange={(e) => setTenantForm({ ...tenantForm, appName: e.target.value })} /></label>
              <label>Support Email<input type="email" value={tenantForm.supportEmail} onChange={(e) => setTenantForm({ ...tenantForm, supportEmail: e.target.value })} /></label>
              <label>Support Phone<input value={tenantForm.supportPhone} onChange={(e) => setTenantForm({ ...tenantForm, supportPhone: e.target.value })} /></label>
              <label>Custom Domain<input value={tenantForm.customDomain} onChange={(e) => setTenantForm({ ...tenantForm, customDomain: e.target.value })} /></label>
              <label>Primary Color<input value={tenantForm.primaryColor} onChange={(e) => setTenantForm({ ...tenantForm, primaryColor: e.target.value })} /></label>
              <label>Secondary Color<input value={tenantForm.secondaryColor} onChange={(e) => setTenantForm({ ...tenantForm, secondaryColor: e.target.value })} /></label>
              <label>
                Platform Commission (bps)
                <input type="number" min={0} max={5000} value={tenantForm.platformCommissionBps} onChange={(e) => setTenantForm({ ...tenantForm, platformCommissionBps: Number(e.target.value) })} />
              </label>
              <button type="submit">Save Tenant</button>
            </form>
            {tenantResult ? <p className={tenantResult.ok ? "status-ok" : "status-error"}>{tenantResult.message}</p> : null}
          </section>

          <section className="card section">
            <h2>Tenant Profile and Activity</h2>
            <div className="grid">
              <div className="card"><strong>Tenant</strong><p>{insights.tenant.name} ({insights.tenant.slug})</p></div>
              <div className="card"><strong>Status</strong><p>{insights.tenant.status}</p></div>
              <div className="card"><strong>Riders</strong><p>{insights.tenant._count.riders}</p></div>
              <div className="card"><strong>Passengers</strong><p>{insights.tenant._count.passengers}</p></div>
              <div className="card"><strong>Trips</strong><p>{insights.tenant._count.trips}</p></div>
              <div className="card"><strong>Transactions</strong><p>{insights.tenant._count.transactions}</p></div>
            </div>

            <h3>Riders</h3>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Availability</th><th>Vehicle</th><th>Trips</th></tr></thead>
              <tbody>
                {insights.riders.map((rider) => (
                  <tr key={rider.id}>
                    <td>{rider.user.fullName}</td>
                    <td>{rider.user.email}</td>
                    <td>{rider.user.status}</td>
                    <td>{rider.availability}</td>
                    <td>{rider.vehicleType} {rider.vehiclePlate}</td>
                    <td>{rider.totalTrips}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Passengers</h3>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Trips</th><th>Wallet</th></tr></thead>
              <tbody>
                {insights.passengers.map((passenger) => (
                  <tr key={passenger.id}>
                    <td>{passenger.user.fullName}</td>
                    <td>{passenger.user.email}</td>
                    <td>{passenger.user.status}</td>
                    <td>{passenger._count.trips}</td>
                    <td>{Number(passenger.walletBalanceMinor) / 100}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Ride History</h3>
            <table className="data-table">
              <thead><tr><th>Trip</th><th>Status</th><th>Rider</th><th>Passenger</th><th>Fare</th><th>Requested</th></tr></thead>
              <tbody>
                {insights.tripHistory.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.id.slice(0, 8)}</td>
                    <td>{trip.status}</td>
                    <td>{trip.rider?.user.fullName ?? "-"}</td>
                    <td>{trip.passenger?.user.fullName ?? "-"}</td>
                    <td>{trip.fareTotalMinor / 100}</td>
                    <td>{new Date(trip.requestedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Transaction History</h3>
            <table className="data-table">
              <thead><tr><th>Transaction</th><th>Trip</th><th>Method</th><th>Status</th><th>Amount</th><th>Time</th></tr></thead>
              <tbody>
                {insights.transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.id.slice(0, 8)}</td>
                    <td>{transaction.tripId.slice(0, 8)}</td>
                    <td>{transaction.method}</td>
                    <td>{transaction.status}</td>
                    <td>{transaction.amountMinor / 100}</td>
                    <td>{new Date(transaction.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </main>
  );
}
