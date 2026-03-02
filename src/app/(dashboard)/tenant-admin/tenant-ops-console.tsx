"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearClientSession, getRoleFromAccessToken, getStoredAccessToken } from "@/lib/auth/client-session";

type MonitoringResponse = {
  data: {
    tenant: {
      id: string;
      name: string;
      slug: string;
    } | null;
    summary: {
      onlineRiders: number;
      totalRiders: number;
      totalPassengers: number;
      activeTripsCount: number;
      completedToday: number;
      cancelledToday: number;
      capturedPayments: number;
      openComplaints: number;
      openSupportTickets: number;
    };
    activeTrips: Array<{
      id: string;
      status: string;
      pickupAddress: string;
      dropoffAddress: string;
      requestedAt: string;
      rider: { user: { fullName: string } } | null;
      passenger: { user: { fullName: string } } | null;
    }>;
    riders: Array<{
      id: string;
      createdAt: string;
      availability: string;
      rating: number;
      totalTrips: number;
      vehicleType: string;
      vehiclePlate: string;
      user: { fullName: string; email: string; phoneNumber: string | null; status: string };
    }>;
    riderOperations: Array<{
      user: {
        id: string;
        fullName: string;
        email: string;
        phoneNumber: string | null;
        status: string;
        createdAt: string;
        lastLoginAt: string | null;
      };
      profile: {
        id: string;
        availability: string;
        rating: number;
        totalTrips: number;
        vehicleType: string;
        vehiclePlate: string;
        vehicleMake: string | null;
        vehicleModel: string | null;
        vehicleColor: string | null;
        earningsMinor: string | number;
        createdAt: string;
      } | null;
      lastTrip: {
        id: string;
        status: string;
        pickupAddress: string;
        dropoffAddress: string;
        requestedAt: string;
        completedAt: string | null;
        cancelledAt: string | null;
        fareTotalMinor: number;
      } | null;
      recentTrips: Array<{
        id: string;
        status: string;
        pickupAddress: string;
        dropoffAddress: string;
        requestedAt: string;
        completedAt: string | null;
        cancelledAt: string | null;
        fareTotalMinor: number;
      }>;
      lastPayment: {
        id: string;
        tripId: string;
        method: string;
        status: string;
        amountMinor: number;
        feeMinor: number;
        discountMinor: number;
        commissionMinor: number;
        createdAt: string;
      } | null;
      recentPayments: Array<{
        id: string;
        tripId: string;
        method: string;
        status: string;
        amountMinor: number;
        feeMinor: number;
        discountMinor: number;
        commissionMinor: number;
        createdAt: string;
      }>;
    }>;
    passengers: Array<{
      id: string;
      createdAt: string;
      rating: number;
      walletBalanceMinor: string | number;
      user: { fullName: string; email: string; phoneNumber: string | null; status: string };
      _count: { trips: number };
    }>;
    tripHistory: Array<{
      id: string;
      status: string;
      pickupAddress: string;
      dropoffAddress: string;
      fareTotalMinor: number;
      requestedAt: string;
      completedAt: string | null;
      cancelledAt: string | null;
      rider: { user: { fullName: string } } | null;
      passenger: { user: { fullName: string } } | null;
    }>;
    payments: Array<{
      id: string;
      tripId: string;
      method: string;
      status: string;
      amountMinor: number;
      feeMinor: number;
      discountMinor: number;
      commissionMinor: number;
      createdAt: string;
    }>;
    complaints: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: string;
    }>;
    supportTickets: Array<{
      id: string;
      subject: string;
      priority: string;
      status: string;
      createdAt: string;
    }>;
    supportCommunications: Array<{
      id: string;
      ticketId: string;
      channel: string;
      direction: string;
      body: string;
      metadata?: {
        reportType?: string;
        tripId?: string | null;
        driverId?: string | null;
        paymentTransactionId?: string | null;
      } | null;
      createdAt: string;
    }>;
    driverEnrollments: Array<{
      id: string;
      createdAt: string;
      riderProfileId: string | null;
      user: { id: string; fullName: string; email: string; phoneNumber: string | null } | null;
      firstName: string | null;
      middleName: string | null;
      lastName: string | null;
      address: string | null;
      phoneNumber: string | null;
      whatsappNumber: string | null;
      identificationType: string | null;
      dateOfBirth: string | null;
      mothersMaidenName: string | null;
      carName: string | null;
      carModel: string | null;
      carYear: number | null;
      carCondition: string | null;
      vehiclePlate: string | null;
      livenessConfirmed: boolean;
      verificationStatus: "pending" | "verified";
      verifiedAt: string | null;
      invitedAt: string | null;
      invitedChannel: string | null;
    }>;
    riderLocationPings: Array<{
      id: string;
      riderId: string;
      tripId: string | null;
      lat: number;
      lng: number;
      speedKph: number | null;
      createdAt: string;
    }>;
    riderComplianceDocs: Array<{
      id: string;
      riderId: string;
      documentType: string;
      status: string;
      expiresAt: string | null;
      createdAt: string;
    }>;
    notifications: Array<{
      id: string;
      channel: string;
      status: string;
      message: string;
      createdAt: string;
    }>;
    systemErrors: Array<{
      id: string;
      level: string;
      service: string | null;
      message: string;
      createdAt: string;
    }>;
    securityLogs: Array<{
      id: string;
      action: string;
      success: boolean;
      ipAddress: string | null;
      createdAt: string;
    }>;
    geofenceAlerts: Array<{
      id: string;
      alertType: string;
      tripId: string | null;
      lat: number | null;
      lng: number | null;
      createdAt: string;
    }>;
    analyticsSnapshots: Array<{
      id: string;
      metricKey: string;
      metricDate: string;
      metricValue: number;
    }>;
  };
};

type ErrorResponse = {
  error?: { message?: string };
};

const STATUS_FILTERS = ["all", "requested", "assigned", "accepted", "arrived", "in_progress", "completed", "cancelled"] as const;
const POLL_INTERVAL_MS = 8000;
const STREAM_RETRY_MS = 3000;

export function TenantOpsConsole() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<MonitoringResponse["data"] | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");
  const [streamState, setStreamState] = useState<"connecting" | "live" | "fallback">("connecting");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [streamRetryTick, setStreamRetryTick] = useState(0);
  const [approveResult, setApproveResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [enrollmentResult, setEnrollmentResult] = useState<{ ok: boolean; message: string } | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      activeLimit: "30",
      peopleLimit: "50",
      historyLimit: "100",
      eventsLimit: "50"
    });
    if (statusFilter !== "all") params.set("status", statusFilter);
    return params.toString();
  }, [statusFilter]);

  const loadData = useCallback(async () => {
    const token = accessToken.trim();
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/tenant/monitoring?${query}`, {
        headers: { authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setSessionReady(false);
          clearClientSession();
          router.replace("/tenant-admin/login");
          return;
        }
        const body = (await response.json()) as ErrorResponse;
        setError(body.error?.message ?? `Monitoring request failed (${response.status})`);
        return;
      }

      const body = (await response.json()) as MonitoringResponse;
      setSnapshot(body.data);
      setLastUpdatedAt(new Date().toLocaleTimeString());
    } catch {
      setError("Network error while loading monitoring data.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, query, router]);

  useEffect(() => {
    const storedToken = getStoredAccessToken();
    if (!storedToken) {
      setSessionReady(false);
      router.replace("/tenant-admin/login");
      return;
    }

    if (getRoleFromAccessToken(storedToken) !== "tenant_admin") {
      setSessionReady(false);
      clearClientSession();
      router.replace("/tenant-admin/login");
      return;
    }

    setAccessToken(storedToken);
    setSessionReady(true);
  }, [router]);

  useEffect(() => {
    if (!accessToken.trim() || !autoRefreshEnabled) return;
    setStreamState("connecting");
    setStreamRetryTick(0);
  }, [accessToken, autoRefreshEnabled, query]);

  useEffect(() => {
    if (!accessToken.trim()) return;
    void loadData();
  }, [accessToken, loadData, query]);

  useEffect(() => {
    const token = accessToken.trim();
    if (!token || !autoRefreshEnabled) return;

    const eventSource = new EventSource(`/api/tenant/monitoring/stream?accessToken=${encodeURIComponent(token)}`);
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const handleReady = () => {
      setStreamState("live");
      void loadData();
    };
    const handleTenantEvent = () => {
      void loadData();
    };

    eventSource.addEventListener("ready", handleReady);
    eventSource.addEventListener("tenant_event", handleTenantEvent);
    eventSource.onerror = () => {
      if (closed) return;
      setStreamState("fallback");
      eventSource.close();
      reconnectTimer = setTimeout(() => {
        setStreamState("connecting");
        setStreamRetryTick((current) => current + 1);
      }, STREAM_RETRY_MS);
    };

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource.removeEventListener("ready", handleReady);
      eventSource.removeEventListener("tenant_event", handleTenantEvent);
      eventSource.close();
    };
  }, [accessToken, autoRefreshEnabled, loadData, query, streamRetryTick]);

  useEffect(() => {
    if (!accessToken.trim() || !autoRefreshEnabled) return;
    void loadData();
    const interval = setInterval(() => {
      void loadData();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [accessToken, autoRefreshEnabled, loadData, query]);

  async function approveRider(riderId: string) {
    if (!accessToken.trim()) return;
    setApproveResult(null);

    try {
      const response = await fetch(`/api/tenant/riders/${riderId}/approve`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${accessToken.trim()}` }
      });

      if (!response.ok) {
        const body = (await response.json()) as ErrorResponse;
        setApproveResult({ ok: false, message: body.error?.message ?? `Approval failed (${response.status})` });
        return;
      }

      setApproveResult({ ok: true, message: "Rider approved successfully." });
      await loadData();
    } catch {
      setApproveResult({ ok: false, message: "Network error while approving rider." });
    }
  }

  async function verifyDriverEnrollment(riderId: string) {
    if (!accessToken.trim()) return;
    setEnrollmentResult(null);
    try {
      const response = await fetch(`/api/tenant/riders/${riderId}/verify-enrollment`, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken.trim()}` }
      });
      if (!response.ok) {
        const body = (await response.json()) as ErrorResponse;
        setEnrollmentResult({ ok: false, message: body.error?.message ?? `Verification failed (${response.status})` });
        return;
      }
      setEnrollmentResult({ ok: true, message: "Driver enrollment verified." });
      await loadData();
    } catch {
      setEnrollmentResult({ ok: false, message: "Network error while verifying enrollment." });
    }
  }

  async function inviteDriverInspection(riderId: string, channel: "email" | "sms") {
    if (!accessToken.trim()) return;
    setEnrollmentResult(null);
    try {
      const response = await fetch(`/api/tenant/riders/${riderId}/invite-inspection`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken.trim()}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ channel })
      });
      if (!response.ok) {
        const body = (await response.json()) as ErrorResponse;
        setEnrollmentResult({ ok: false, message: body.error?.message ?? `Invite failed (${response.status})` });
        return;
      }
      setEnrollmentResult({ ok: true, message: `Inspection invite queued via ${channel}.` });
      await loadData();
    } catch {
      setEnrollmentResult({ ok: false, message: "Network error while sending inspection invite." });
    }
  }

  if (!sessionReady) {
    return <div className="alert alert-warning mb-0">Redirecting to login...</div>;
  }

  return (
    <section className="card section">
      <h2 className="mb-2">Live Operations Console</h2>
      {snapshot?.tenant ? <p className="muted">Tenant: {snapshot.tenant.name} ({snapshot.tenant.slug})</p> : null}
      <p className="muted">
        {!autoRefreshEnabled
          ? "Auto-refresh is off. Use Refresh Now to load the latest data."
          : streamState === "live"
          ? "Live updates via SSE stream."
          : streamState === "connecting"
            ? "Connecting to live stream..."
            : "Stream unavailable. Reconnecting automatically while 8s polling keeps data current."}
      </p>

      <div className="form-grid">
        <label>
          Ride Status Filter
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="toolbar">
        <button onClick={() => void loadData()} disabled={!accessToken.trim() || loading}>
          {loading ? "Refreshing..." : "Refresh Now"}
        </button>
        <button type="button" onClick={() => setAutoRefreshEnabled((current) => !current)}>
          {autoRefreshEnabled ? "Auto-refresh: On" : "Auto-refresh: Off"}
        </button>
        <button
          type="button"
          onClick={() => {
            clearClientSession();
            setAccessToken("");
            setSnapshot(null);
            router.push("/tenant-admin/login");
          }}
        >
          Logout
        </button>
        {lastUpdatedAt ? <span className="muted">Last updated: {lastUpdatedAt}</span> : null}
      </div>

      {error ? <p className="status-error">{error}</p> : null}
      {approveResult ? <p className={approveResult.ok ? "status-ok" : "status-error"}>{approveResult.message}</p> : null}
      {enrollmentResult ? <p className={enrollmentResult.ok ? "status-ok" : "status-error"}>{enrollmentResult.message}</p> : null}
      {!snapshot ? <p className="muted">Loading drivers, riders, ride records, logs, and analytics.</p> : null}

      {snapshot ? (
        <>
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
                      <img src="/studio/assets/img/page/dashboard.svg" alt="" className="d-block ms-n3 mb-5" style={{ maxHeight: 260 }} />
                    </div>
                  </div>
                </div>
                <div className="card-body position-relative text-white text-opacity-70">
                  <div className="row">
                    <div className="col-md-8">
                      <div className="d-flex">
                        <div className="me-auto">
                          <h5 className="text-white text-opacity-80 mb-3">Tenant Live Snapshot</h5>
                          <h3 className="text-white mt-n1 mb-1">{snapshot.summary.activeTripsCount} Active Trips</h3>
                          <p className="mb-1 text-white text-opacity-60 text-truncate">
                            <i className="fa fa-caret-up"></i> Operations monitoring
                          </p>
                        </div>
                      </div>
                      <hr className="bg-white bg-opacity-75 mt-3 mb-3" />
                      <div className="row">
                        <div className="col-6 col-lg-5">
                          <div className="mt-1">
                            <i className="fa fa-fw fa-motorcycle fs-28px text-black text-opacity-50"></i>
                          </div>
                          <div className="mt-1">
                            <div>Online Drivers</div>
                            <div className="fw-600 text-white">{snapshot.summary.onlineRiders}</div>
                          </div>
                        </div>
                        <div className="col-6 col-lg-5">
                          <div className="mt-1">
                            <i className="fa fa-fw fa-wallet fs-28px text-black text-opacity-50"></i>
                          </div>
                          <div className="mt-1">
                            <div>Captured Payments</div>
                            <div className="fw-600 text-white">{snapshot.summary.capturedPayments}</div>
                          </div>
                        </div>
                      </div>
                      <hr className="bg-white bg-opacity-75 mt-3 mb-3" />
                      <p className="fs-12px">Track driver activity, trips, tickets, and rider lifecycle in one stream.</p>
                    </div>
                    <div className="col-md-4 d-none d-md-block" style={{ minHeight: 300 }}></div>
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
                      <h5 className="text-white text-opacity-80 mb-3 fs-16px">Drivers Registered</h5>
                      <h3 className="text-white mt-n1">{snapshot.summary.totalRiders}</h3>
                    </div>
                  </div>
                  <div className="card mb-3 overflow-hidden fs-13px border-0 bg-gradient-custom-teal" style={{ minHeight: 199 }}>
                    <div className="card-img-overlay mb-n4 me-n4 d-flex" style={{ bottom: 0, top: "auto" }}>
                      <img src="/studio/assets/img/icon/visitor.svg" alt="" className="ms-auto d-block mb-n3" style={{ maxHeight: 105 }} />
                    </div>
                    <div className="card-body position-relative">
                      <h5 className="text-white text-opacity-80 mb-3 fs-16px">Riders Registered</h5>
                      <h3 className="text-white mt-n1">{snapshot.summary.totalPassengers}</h3>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="card mb-3 overflow-hidden fs-13px border-0 bg-gradient-custom-pink" style={{ minHeight: 199 }}>
                    <div className="card-img-overlay mb-n4 me-n4 d-flex" style={{ bottom: 0, top: "auto" }}>
                      <img src="/studio/assets/img/icon/email.svg" alt="" className="ms-auto d-block mb-n3" style={{ maxHeight: 105 }} />
                    </div>
                    <div className="card-body position-relative">
                      <h5 className="text-white text-opacity-80 mb-3 fs-16px">Completed Today</h5>
                      <h3 className="text-white mt-n1">{snapshot.summary.completedToday}</h3>
                    </div>
                  </div>
                  <div className="card mb-3 overflow-hidden fs-13px border-0 bg-gradient-custom-indigo" style={{ minHeight: 199 }}>
                    <div className="card-img-overlay mb-n4 me-n4 d-flex" style={{ bottom: 0, top: "auto" }}>
                      <img src="/studio/assets/img/icon/browser.svg" alt="" className="ms-auto d-block mb-n3" style={{ maxHeight: 105 }} />
                    </div>
                    <div className="card-body position-relative">
                      <h5 className="text-white text-opacity-80 mb-3 fs-16px">Open Tickets</h5>
                      <h3 className="text-white mt-n1">{snapshot.summary.openSupportTickets}</h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="section-block">
            <h3>Active Trips Monitoring</h3>
            <table className="data-table">
              <thead><tr><th>Trip</th><th>Status</th><th>Driver</th><th>Rider</th><th>Route</th><th>Requested</th></tr></thead>
              <tbody>
                {snapshot.activeTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.id.slice(0, 8)}</td>
                    <td>{trip.status}</td>
                    <td>{trip.rider?.user.fullName ?? "Unassigned"}</td>
                    <td>{trip.passenger?.user.fullName ?? "Unknown"}</td>
                    <td>{trip.pickupAddress} to {trip.dropoffAddress}</td>
                    <td>{new Date(trip.requestedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-block">
            <h3>Drivers and Riders Registry</h3>
            <table className="data-table">
              <thead><tr><th>Type</th><th>Name</th><th>Email</th><th>Status</th><th>Detail</th><th>Action</th><th>Joined</th></tr></thead>
              <tbody>
                {snapshot.riders.map((rider) => (
                  <tr key={`r-${rider.id}`}>
                    <td>driver</td>
                    <td>{rider.user.fullName}</td>
                    <td>{rider.user.email}</td>
                    <td>{rider.availability}</td>
                    <td>{rider.vehicleType} {rider.vehiclePlate}</td>
                    <td>
                      {rider.user.status === "pending" ? (
                        <button type="button" onClick={() => void approveRider(rider.id)}>Approve</button>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td>{new Date(rider.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {snapshot.passengers.map((passenger) => (
                  <tr key={`p-${passenger.id}`}>
                    <td>rider</td>
                    <td>{passenger.user.fullName}</td>
                    <td>{passenger.user.email}</td>
                    <td>{passenger.user.status}</td>
                    <td>{passenger._count.trips} trips</td>
                    <td><span className="muted">-</span></td>
                    <td>{new Date(passenger.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-block">
            <h3>Registered Driver Operations Details</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Contact</th>
                  <th>Account</th>
                  <th>Vehicle + Ops</th>
                  <th>Registered / Login</th>
                  <th>Last Trip</th>
                  <th>Trip History</th>
                  <th>Last Transaction</th>
                  <th>Payment History</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.riderOperations.map((entry) => (
                  <tr key={`ops-${entry.user.id}`}>
                    <td>
                      <strong>{entry.user.fullName}</strong>
                      <br />
                      <span className="muted">User: {entry.user.id.slice(0, 8)}</span>
                    </td>
                    <td>
                      {entry.user.email}
                      <br />
                      {entry.user.phoneNumber ?? "-"}
                    </td>
                    <td>
                      Status: {entry.user.status}
                      <br />
                      Availability: {entry.profile?.availability ?? "profile_missing"}
                      <br />
                      Rating: {entry.profile?.rating ?? "-"}
                      <br />
                      Total trips: {entry.profile?.totalTrips ?? entry.recentTrips.length}
                    </td>
                    <td>
                      {entry.profile
                        ? `${entry.profile.vehicleType} ${entry.profile.vehiclePlate}`
                        : "No rider profile linked"}
                      <br />
                      {entry.profile ? `Make/Model: ${entry.profile.vehicleMake ?? "-"} ${entry.profile.vehicleModel ?? "-"}` : "-"}
                      <br />
                      {entry.profile ? `Color: ${entry.profile.vehicleColor ?? "-"}` : "-"}
                      <br />
                      {entry.profile
                        ? `Earnings: ${(Number(entry.profile.earningsMinor) / 100).toFixed(2)}`
                        : "-"}
                    </td>
                    <td>
                      Registered: {new Date(entry.user.createdAt).toLocaleString()}
                      <br />
                      Last login: {entry.user.lastLoginAt ? new Date(entry.user.lastLoginAt).toLocaleString() : "never"}
                    </td>
                    <td>
                      {entry.lastTrip ? (
                        <>
                          {entry.lastTrip.id.slice(0, 8)} ({entry.lastTrip.status})
                          <br />
                          {entry.lastTrip.pickupAddress} to {entry.lastTrip.dropoffAddress}
                          <br />
                          Fare: {(entry.lastTrip.fareTotalMinor / 100).toFixed(2)}
                          <br />
                          {new Date(entry.lastTrip.requestedAt).toLocaleString()}
                        </>
                      ) : (
                        <span className="muted">No trips yet</span>
                      )}
                    </td>
                    <td>
                      {entry.recentTrips.length ? (
                        entry.recentTrips.map((trip) => (
                          <div key={trip.id}>
                            {trip.id.slice(0, 8)} {trip.status} {(trip.fareTotalMinor / 100).toFixed(2)}
                          </div>
                        ))
                      ) : (
                        <span className="muted">No trip history</span>
                      )}
                    </td>
                    <td>
                      {entry.lastPayment ? (
                        <>
                          {entry.lastPayment.id.slice(0, 8)} ({entry.lastPayment.status})
                          <br />
                          Trip: {entry.lastPayment.tripId.slice(0, 8)}
                          <br />
                          {(entry.lastPayment.amountMinor / 100).toFixed(2)} via {entry.lastPayment.method}
                          <br />
                          {new Date(entry.lastPayment.createdAt).toLocaleString()}
                        </>
                      ) : (
                        <span className="muted">No transactions</span>
                      )}
                    </td>
                    <td>
                      {entry.recentPayments.length ? (
                        entry.recentPayments.map((payment) => (
                          <div key={payment.id}>
                            {payment.id.slice(0, 8)} {(payment.amountMinor / 100).toFixed(2)} {payment.status}
                          </div>
                        ))
                      ) : (
                        <span className="muted">No payment history</span>
                      )}
                    </td>
                    <td>
                      {entry.profile?.id && entry.user.status === "pending" ? (
                        <button type="button" onClick={() => void approveRider(entry.profile!.id)}>
                          Approve
                        </button>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-block">
            <h3>Driver Enrollment Verification</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Contact</th>
                  <th>ID + DOB</th>
                  <th>Address + Vehicle</th>
                  <th>Liveness</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.driverEnrollments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{(item.user?.fullName ?? `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim()) || "-"}</strong>
                      <br />
                      <span className="muted">Submitted: {new Date(item.createdAt).toLocaleString()}</span>
                    </td>
                    <td>
                      Email: {item.user?.email ?? "-"}
                      <br />
                      Phone: {item.phoneNumber ?? "-"}
                      <br />
                      WhatsApp: {item.whatsappNumber ?? "-"}
                    </td>
                    <td>
                      {item.identificationType ?? "-"}
                      <br />
                      DOB: {item.dateOfBirth ?? "-"}
                      <br />
                      Mother: {item.mothersMaidenName ?? "-"}
                    </td>
                    <td>
                      {item.address ?? "-"}
                      <br />
                      {item.carName ?? "-"} {item.carModel ?? "-"} {item.carYear ?? "-"}
                      <br />
                      {item.carCondition ?? "-"} | Plate: {item.vehiclePlate ?? "-"}
                    </td>
                    <td>{item.livenessConfirmed ? "passed" : "missing"}</td>
                    <td>
                      {item.verificationStatus}
                      <br />
                      <span className="muted">Invite: {item.invitedAt ? `${new Date(item.invitedAt).toLocaleString()} (${item.invitedChannel ?? "-"})` : "pending"}</span>
                    </td>
                    <td>
                      {item.riderProfileId ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void verifyDriverEnrollment(item.riderProfileId!)}
                            disabled={item.verificationStatus === "verified"}
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => void inviteDriverInspection(item.riderProfileId!, "email")}
                            disabled={item.verificationStatus !== "verified"}
                          >
                            Invite Email
                          </button>
                          <button
                            type="button"
                            onClick={() => void inviteDriverInspection(item.riderProfileId!, "sms")}
                            disabled={item.verificationStatus !== "verified"}
                          >
                            Invite SMS
                          </button>
                        </>
                      ) : (
                        <span className="muted">No rider profile</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-block">
            <h3>Trip and Payment History</h3>
            <table className="data-table">
              <thead><tr><th>Trip</th><th>Status</th><th>Driver</th><th>Rider</th><th>Fare</th><th>Requested</th><th>Closed</th></tr></thead>
              <tbody>
                {snapshot.tripHistory.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.id.slice(0, 8)}</td>
                    <td>{trip.status}</td>
                    <td>{trip.rider?.user.fullName ?? "Unassigned"}</td>
                    <td>{trip.passenger?.user.fullName ?? "Unknown"}</td>
                    <td>{trip.fareTotalMinor / 100}</td>
                    <td>{new Date(trip.requestedAt).toLocaleString()}</td>
                    <td>{trip.completedAt ? new Date(trip.completedAt).toLocaleString() : trip.cancelledAt ? new Date(trip.cancelledAt).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="data-table">
              <thead><tr><th>Payment</th><th>Trip</th><th>Method</th><th>Status</th><th>Amount</th><th>Discount</th><th>Time</th></tr></thead>
              <tbody>
                {snapshot.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.id.slice(0, 8)}</td>
                    <td>{payment.tripId.slice(0, 8)}</td>
                    <td>{payment.method}</td>
                    <td>{payment.status}</td>
                    <td>{payment.amountMinor / 100}</td>
                    <td>{payment.discountMinor / 100}</td>
                    <td>{new Date(payment.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-block">
            <h3>Support, Feedback and Compliance</h3>
            <table className="data-table">
              <thead><tr><th>Type</th><th>Ref</th><th>Status</th><th>Detail</th><th>Created</th></tr></thead>
              <tbody>
                {snapshot.complaints.map((item) => (
                  <tr key={`c-${item.id}`}><td>complaint</td><td>{item.id.slice(0, 8)}</td><td>{item.status}</td><td>{item.title}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
                ))}
                {snapshot.supportTickets.map((item) => (
                  <tr key={`t-${item.id}`}><td>ticket</td><td>{item.id.slice(0, 8)}</td><td>{item.status}</td><td>{item.subject}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
                ))}
                {snapshot.riderComplianceDocs.map((item) => (
                  <tr key={`d-${item.id}`}><td>compliance</td><td>{item.riderId.slice(0, 8)}</td><td>{item.status}</td><td>{item.documentType}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-block">
            <h3>Logs, Notifications, Geolocation, Analytics</h3>
            <table className="data-table">
              <thead><tr><th>Type</th><th>Ref</th><th>Status</th><th>Message/Action</th><th>Time</th></tr></thead>
              <tbody>
                {snapshot.notifications.map((item) => (
                  <tr key={`n-${item.id}`}><td>notification</td><td>{item.channel}</td><td>{item.status}</td><td>{item.message}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
                ))}
                {snapshot.systemErrors.map((item) => (
                  <tr key={`e-${item.id}`}><td>system</td><td>{item.level}</td><td>{item.service ?? "service"}</td><td>{item.message}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
                ))}
                {snapshot.securityLogs.map((item) => (
                  <tr key={`s-${item.id}`}><td>security</td><td>{item.action}</td><td>{item.success ? "success" : "failed"}</td><td>{item.ipAddress ?? "-"}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
                ))}
                {snapshot.riderLocationPings.map((item) => (
                  <tr key={`l-${item.id}`}><td>gps</td><td>{item.riderId.slice(0, 8)}</td><td>{item.tripId ? "on_trip" : "idle"}</td><td>{item.lat.toFixed(4)}, {item.lng.toFixed(4)}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
                ))}
                {snapshot.geofenceAlerts.map((item) => (
                  <tr key={`g-${item.id}`}><td>geofence</td><td>{item.alertType}</td><td>{item.tripId ? item.tripId.slice(0, 8) : "-"}</td><td>{item.lat ?? "-"}, {item.lng ?? "-"}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
                ))}
                {snapshot.analyticsSnapshots.map((item) => (
                  <tr key={`a-${item.id}`}><td>analytics</td><td>{item.metricKey}</td><td>{item.metricValue}</td><td>{new Date(item.metricDate).toLocaleDateString()}</td><td>{new Date(item.metricDate).toLocaleString()}</td></tr>
                ))}
                {snapshot.supportCommunications.map((item) => (
                  <tr key={`m-${item.id}`}>
                    <td>support-msg</td>
                    <td>{item.channel}</td>
                    <td>{item.direction}</td>
                    <td>
                      {item.metadata?.reportType ? `${item.metadata.reportType}: ` : ""}
                      {item.body.slice(0, 120)}
                      {item.metadata?.tripId ? ` | trip ${item.metadata.tripId.slice(0, 8)}` : ""}
                      {item.metadata?.paymentTransactionId ? ` | txn ${item.metadata.paymentTransactionId.slice(0, 8)}` : ""}
                    </td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}



