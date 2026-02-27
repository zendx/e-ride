import { Role, TripStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { fail, ok } from "@/lib/http";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db";

const ACTIVE_STATUSES: TripStatus[] = ["requested", "assigned", "accepted", "arrived", "in_progress"];

function parseStatus(input: string | null): TripStatus | undefined {
  if (!input) return undefined;
  if (
    input === "requested" ||
    input === "assigned" ||
    input === "accepted" ||
    input === "arrived" ||
    input === "in_progress" ||
    input === "completed" ||
    input === "cancelled"
  ) {
    return input;
  }
  return undefined;
}

function parseLimit(input: string | null, fallback: number) {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), 100);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.tenant_admin, Role.dispatcher]);
    if (!auth.tenantId) throw new AppError("Tenant missing in token", 400, "tenant_missing");

    const url = new URL(request.url);
    const historyStatus = parseStatus(url.searchParams.get("status"));
    const historyLimit = parseLimit(url.searchParams.get("historyLimit"), 50);
    const peopleLimit = parseLimit(url.searchParams.get("peopleLimit"), 50);
    const activeLimit = parseLimit(url.searchParams.get("activeLimit"), 30);
    const eventsLimit = parseLimit(url.searchParams.get("eventsLimit"), 40);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      summary,
      activeTrips,
      riders,
      passengers,
      tripHistory,
      payments,
      complaints,
      supportTickets,
      supportCommunications,
      riderLocationPings,
      riderComplianceDocs,
      notifications,
      systemErrors,
      securityLogs,
      geofenceAlerts,
      analyticsSnapshots
    ] = await Promise.all([
      Promise.all([
        prisma.riderProfile.count({ where: { tenantId: auth.tenantId, availability: "online" } }),
        prisma.riderProfile.count({ where: { tenantId: auth.tenantId } }),
        prisma.passengerProfile.count({ where: { tenantId: auth.tenantId } }),
        prisma.trip.count({ where: { tenantId: auth.tenantId, status: { in: ACTIVE_STATUSES } } }),
        prisma.trip.count({ where: { tenantId: auth.tenantId, status: "completed", completedAt: { gte: todayStart } } }),
        prisma.trip.count({ where: { tenantId: auth.tenantId, status: "cancelled", cancelledAt: { gte: todayStart } } }),
        prisma.paymentTransaction.count({ where: { tenantId: auth.tenantId, status: "captured" } }),
        prisma.complaint.count({ where: { tenantId: auth.tenantId, status: { in: ["open", "investigating"] } } }),
        prisma.supportTicket.count({ where: { tenantId: auth.tenantId, status: { in: ["open", "pending", "investigating"] } } })
      ]).then(
        ([
          onlineRiders,
          totalRiders,
          totalPassengers,
          activeTripsCount,
          completedToday,
          cancelledToday,
          capturedPayments,
          openComplaints,
          openSupportTickets
        ]) => ({
        onlineRiders,
        totalRiders,
        totalPassengers,
        activeTripsCount,
        completedToday,
        cancelledToday,
        capturedPayments,
        openComplaints,
        openSupportTickets
      })
      ),

      prisma.trip.findMany({
        where: { tenantId: auth.tenantId, status: { in: ACTIVE_STATUSES } },
        orderBy: { updatedAt: "desc" },
        take: activeLimit,
        select: {
          id: true,
          status: true,
          pickupAddress: true,
          dropoffAddress: true,
          pickupLat: true,
          pickupLng: true,
          dropoffLat: true,
          dropoffLng: true,
          requestedAt: true,
          acceptedAt: true,
          startedAt: true,
          rider: {
            select: {
              id: true,
              user: { select: { fullName: true, phoneNumber: true } }
            }
          },
          passenger: {
            select: {
              id: true,
              user: { select: { fullName: true, phoneNumber: true } }
            }
          }
        }
      }),

      prisma.riderProfile.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: peopleLimit,
        select: {
          id: true,
          createdAt: true,
          availability: true,
          rating: true,
          totalTrips: true,
          vehicleType: true,
          vehiclePlate: true,
          user: {
            select: {
              fullName: true,
              email: true,
              phoneNumber: true,
              status: true
            }
          }
        }
      }),

      prisma.passengerProfile.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: peopleLimit,
        select: {
          id: true,
          createdAt: true,
          rating: true,
          walletBalanceMinor: true,
          user: {
            select: {
              fullName: true,
              email: true,
              phoneNumber: true,
              status: true
            }
          },
          _count: { select: { trips: true } }
        }
      }),

      prisma.trip.findMany({
        where: {
          tenantId: auth.tenantId,
          ...(historyStatus ? { status: historyStatus } : {})
        },
        orderBy: { requestedAt: "desc" },
        take: historyLimit,
        select: {
          id: true,
          status: true,
          pickupAddress: true,
          dropoffAddress: true,
          fareTotalMinor: true,
          requestedAt: true,
          acceptedAt: true,
          arrivedAt: true,
          startedAt: true,
          completedAt: true,
          cancelledAt: true,
          cancelReason: true,
          rider: { select: { user: { select: { fullName: true } } } },
          passenger: { select: { user: { select: { fullName: true } } } }
        }
      }),

      prisma.paymentTransaction.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: historyLimit,
        select: {
          id: true,
          tripId: true,
          method: true,
          status: true,
          amountMinor: true,
          feeMinor: true,
          discountMinor: true,
          commissionMinor: true,
          receiptUrl: true,
          providerReference: true,
          createdAt: true
        }
      }),

      prisma.complaint.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: historyLimit,
        select: {
          id: true,
          title: true,
          status: true,
          resolutionNotes: true,
          createdAt: true,
          updatedAt: true
        }
      }),

      prisma.supportTicket.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: historyLimit,
        select: {
          id: true,
          subject: true,
          priority: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      }),

      prisma.supportCommunication.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: eventsLimit,
        select: {
          id: true,
          ticketId: true,
          channel: true,
          direction: true,
          body: true,
          createdAt: true
        }
      }),

      prisma.driverLocationPing.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: eventsLimit,
        select: {
          id: true,
          riderId: true,
          tripId: true,
          lat: true,
          lng: true,
          speedKph: true,
          createdAt: true
        }
      }),

      prisma.driverComplianceDocument.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: eventsLimit,
        select: {
          id: true,
          riderId: true,
          documentType: true,
          status: true,
          expiresAt: true,
          createdAt: true
        }
      }),

      prisma.notificationLog.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: eventsLimit,
        select: {
          id: true,
          userId: true,
          channel: true,
          title: true,
          message: true,
          status: true,
          providerMessageId: true,
          createdAt: true
        }
      }),

      prisma.systemErrorLog.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: eventsLimit,
        select: {
          id: true,
          level: true,
          service: true,
          message: true,
          createdAt: true
        }
      }),

      prisma.securityLog.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: eventsLimit,
        select: {
          id: true,
          userId: true,
          action: true,
          success: true,
          ipAddress: true,
          createdAt: true
        }
      }),

      prisma.geofenceAlert.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: eventsLimit,
        select: {
          id: true,
          tripId: true,
          zoneId: true,
          alertType: true,
          lat: true,
          lng: true,
          createdAt: true
        }
      }),

      prisma.analyticsSnapshot.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { metricDate: "desc" },
        take: eventsLimit,
        select: {
          id: true,
          metricKey: true,
          metricDate: true,
          metricValue: true
        }
      })
    ]);

    return ok({
      summary,
      activeTrips,
      riders,
      passengers,
      tripHistory,
      payments,
      complaints,
      supportTickets,
      supportCommunications,
      riderLocationPings,
      riderComplianceDocs,
      notifications,
      systemErrors,
      securityLogs,
      geofenceAlerts,
      analyticsSnapshots
    });
  } catch (error) {
    return fail(error);
  }
}
