import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as monitoringGet } from "@/app/(public)/api/tenant/monitoring/route";

const {
  getAuthContextMock,
  riderCountMock,
  passengerCountMock,
  tripCountMock,
  paymentCountMock,
  complaintCountMock,
  supportTicketCountMock,
  ridersFindManyMock,
  passengersFindManyMock,
  tripFindManyMock,
  paymentFindManyMock,
  complaintFindManyMock,
  supportTicketFindManyMock,
  supportCommunicationFindManyMock,
  driverLocationPingFindManyMock,
  driverComplianceDocFindManyMock,
  notificationFindManyMock,
  systemErrorFindManyMock,
  securityLogFindManyMock,
  geofenceAlertFindManyMock,
  analyticsSnapshotFindManyMock
} = vi.hoisted(() => ({
  getAuthContextMock: vi.fn(),
  riderCountMock: vi.fn(),
  passengerCountMock: vi.fn(),
  tripCountMock: vi.fn(),
  paymentCountMock: vi.fn(),
  complaintCountMock: vi.fn(),
  supportTicketCountMock: vi.fn(),
  ridersFindManyMock: vi.fn(),
  passengersFindManyMock: vi.fn(),
  tripFindManyMock: vi.fn(),
  paymentFindManyMock: vi.fn(),
  complaintFindManyMock: vi.fn(),
  supportTicketFindManyMock: vi.fn(),
  supportCommunicationFindManyMock: vi.fn(),
  driverLocationPingFindManyMock: vi.fn(),
  driverComplianceDocFindManyMock: vi.fn(),
  notificationFindManyMock: vi.fn(),
  systemErrorFindManyMock: vi.fn(),
  securityLogFindManyMock: vi.fn(),
  geofenceAlertFindManyMock: vi.fn(),
  analyticsSnapshotFindManyMock: vi.fn()
}));

vi.mock("@/lib/auth/context", () => ({
  getAuthContext: getAuthContextMock
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    riderProfile: {
      count: riderCountMock,
      findMany: ridersFindManyMock
    },
    passengerProfile: {
      count: passengerCountMock,
      findMany: passengersFindManyMock
    },
    trip: {
      count: tripCountMock,
      findMany: tripFindManyMock
    },
    paymentTransaction: {
      count: paymentCountMock,
      findMany: paymentFindManyMock
    },
    complaint: {
      count: complaintCountMock,
      findMany: complaintFindManyMock
    },
    supportTicket: {
      count: supportTicketCountMock,
      findMany: supportTicketFindManyMock
    },
    supportCommunication: {
      findMany: supportCommunicationFindManyMock
    },
    driverLocationPing: {
      findMany: driverLocationPingFindManyMock
    },
    driverComplianceDocument: {
      findMany: driverComplianceDocFindManyMock
    },
    notificationLog: {
      findMany: notificationFindManyMock
    },
    systemErrorLog: {
      findMany: systemErrorFindManyMock
    },
    securityLog: {
      findMany: securityLogFindManyMock
    },
    geofenceAlert: {
      findMany: geofenceAlertFindManyMock
    },
    analyticsSnapshot: {
      findMany: analyticsSnapshotFindManyMock
    }
  }
}));

describe("tenant monitoring API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    paymentCountMock.mockResolvedValue(0);
    complaintCountMock.mockResolvedValue(0);
    supportTicketCountMock.mockResolvedValue(0);

    ridersFindManyMock.mockResolvedValue([]);
    passengersFindManyMock.mockResolvedValue([]);
    paymentFindManyMock.mockResolvedValue([]);
    complaintFindManyMock.mockResolvedValue([]);
    supportTicketFindManyMock.mockResolvedValue([]);
    supportCommunicationFindManyMock.mockResolvedValue([]);
    driverLocationPingFindManyMock.mockResolvedValue([]);
    driverComplianceDocFindManyMock.mockResolvedValue([]);
    notificationFindManyMock.mockResolvedValue([]);
    systemErrorFindManyMock.mockResolvedValue([]);
    securityLogFindManyMock.mockResolvedValue([]);
    geofenceAlertFindManyMock.mockResolvedValue([]);
    analyticsSnapshotFindManyMock.mockResolvedValue([]);
  });

  it("forbids unauthorized roles", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u1",
      role: "passenger",
      tenantId: "tenant-a"
    });

    const response = await monitoringGet(new Request("http://localhost/api/tenant/monitoring") as never);
    expect(response.status).toBe(403);
  });

  it("requires tenantId in token", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u1",
      role: "tenant_admin"
    });

    const response = await monitoringGet(new Request("http://localhost/api/tenant/monitoring") as never);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("tenant_missing");
  });

  it("returns monitoring payload scoped by tenant", async () => {
    getAuthContextMock.mockResolvedValue({
      userId: "u1",
      role: "tenant_admin",
      tenantId: "tenant-a"
    });

    riderCountMock.mockResolvedValueOnce(3).mockResolvedValueOnce(10);
    passengerCountMock.mockResolvedValueOnce(25);
    tripCountMock.mockResolvedValueOnce(6).mockResolvedValueOnce(12).mockResolvedValueOnce(2);

    tripFindManyMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const response = await monitoringGet(
      new Request("http://localhost/api/tenant/monitoring?status=completed&historyLimit=20&peopleLimit=10") as never
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.summary.onlineRiders).toBe(3);
    expect(body.data.summary.totalRiders).toBe(10);
    expect(body.data.summary.totalPassengers).toBe(25);
    expect(body.data.summary.activeTripsCount).toBe(6);
    expect(body.data.summary.completedToday).toBe(12);
    expect(body.data.summary.cancelledToday).toBe(2);

    expect(ridersFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-a" }
      })
    );
    expect(passengersFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-a" }
      })
    );
  });
});
