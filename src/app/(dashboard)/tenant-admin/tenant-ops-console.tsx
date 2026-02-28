"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearClientSession, getRoleFromAccessToken, getStoredAccessToken } from "@/lib/auth/client-session";

type MonitoringResponse = {
  data: {
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
      createdAt: string;
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

export function TenantOpsConsole() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<MonitoringResponse["data"] | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");

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
    if (!accessToken.trim()) return;
    void loadData();
    const interval = setInterval(() => {
      void loadData();
    }, 8000);
    return () => clearInterval(interval);
  }, [accessToken, loadData]);

  if (!sessionReady) {
    return <p className="muted">Redirecting to login...</p>;
  }

  return (
    <section className="card section">
      <h2>Live Operations Console</h2>
      <p className="muted">Near real-time monitoring with 8s refresh.</p>

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
      {!snapshot ? <p className="muted">Loading riders, passengers, ride records, logs, and analytics.</p> : null}

      {snapshot ? (
        <>
          <div className="grid">
            <div className="card"><strong>Active Trips</strong><p>{snapshot.summary.activeTripsCount}</p></div>
            <div className="card"><strong>Online Riders</strong><p>{snapshot.summary.onlineRiders}</p></div>
            <div className="card"><strong>Riders Registered</strong><p>{snapshot.summary.totalRiders}</p></div>
            <div className="card"><strong>Passengers Registered</strong><p>{snapshot.summary.totalPassengers}</p></div>
            <div className="card"><strong>Completed Today</strong><p>{snapshot.summary.completedToday}</p></div>
            <div className="card"><strong>Cancelled Today</strong><p>{snapshot.summary.cancelledToday}</p></div>
            <div className="card"><strong>Captured Payments</strong><p>{snapshot.summary.capturedPayments}</p></div>
            <div className="card"><strong>Open Complaints</strong><p>{snapshot.summary.openComplaints}</p></div>
            <div className="card"><strong>Open Support Tickets</strong><p>{snapshot.summary.openSupportTickets}</p></div>
          </div>

          <div className="section-block">
            <h3>Active Trips Monitoring</h3>
            <table className="data-table">
              <thead><tr><th>Trip</th><th>Status</th><th>Rider</th><th>Passenger</th><th>Route</th><th>Requested</th></tr></thead>
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
            <h3>Riders and Passengers Registry</h3>
            <table className="data-table">
              <thead><tr><th>Type</th><th>Name</th><th>Email</th><th>Status</th><th>Detail</th><th>Joined</th></tr></thead>
              <tbody>
                {snapshot.riders.map((rider) => (
                  <tr key={`r-${rider.id}`}>
                    <td>rider</td>
                    <td>{rider.user.fullName}</td>
                    <td>{rider.user.email}</td>
                    <td>{rider.availability}</td>
                    <td>{rider.vehicleType} {rider.vehiclePlate}</td>
                    <td>{new Date(rider.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {snapshot.passengers.map((passenger) => (
                  <tr key={`p-${passenger.id}`}>
                    <td>passenger</td>
                    <td>{passenger.user.fullName}</td>
                    <td>{passenger.user.email}</td>
                    <td>{passenger.user.status}</td>
                    <td>{passenger._count.trips} trips</td>
                    <td>{new Date(passenger.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-block">
            <h3>Trip and Payment History</h3>
            <table className="data-table">
              <thead><tr><th>Trip</th><th>Status</th><th>Rider</th><th>Passenger</th><th>Fare</th><th>Requested</th><th>Closed</th></tr></thead>
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
                  <tr key={`m-${item.id}`}><td>support-msg</td><td>{item.channel}</td><td>{item.direction}</td><td>{item.body.slice(0, 120)}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}



