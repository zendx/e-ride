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

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
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
      tenant,
      summary,
      activeTrips,
      riders,
      passengers,
      tripHistory,
      payments,
      complaints,
      supportTickets,
      supportCommunications,
      driverEnrollments,
      riderLocationPings,
      riderComplianceDocs,
      notifications,
      systemErrors,
      securityLogs,
      geofenceAlerts,
      analyticsSnapshots
    ] = await Promise.all([
      safe(
        () => prisma.tenant.findUnique({
          where: { id: auth.tenantId },
          select: { id: true, name: true, slug: true }
        }),
        null
      ),
      safe(
        () =>
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
        {
          onlineRiders: 0,
          totalRiders: 0,
          totalPassengers: 0,
          activeTripsCount: 0,
          completedToday: 0,
          cancelledToday: 0,
          capturedPayments: 0,
          openComplaints: 0,
          openSupportTickets: 0
        }
      ),

      safe(() => prisma.trip.findMany({
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
      }), []),

      safe(() => prisma.riderProfile.findMany({
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
      }), []),

      safe(() => prisma.passengerProfile.findMany({
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
      }), []),

      safe(() => prisma.trip.findMany({
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
      }), []),

      safe(() => prisma.paymentTransaction.findMany({
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
      }), []),

      safe(() => prisma.complaint.findMany({
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
      }), []),

      safe(() => prisma.supportTicket.findMany({
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
      }), []),

      safe(() => prisma.supportCommunication.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: "desc" },
        take: eventsLimit,
        select: {
          id: true,
          ticketId: true,
          channel: true,
          direction: true,
          body: true,
          metadata: true,
          createdAt: true
        }
      }), []),

      safe(async () => {
        const [enrollments, verifications, invites] = await Promise.all([
          prisma.securityLog.findMany({
            where: { tenantId: auth.tenantId, action: "driver.enrollment_submitted" },
            orderBy: { createdAt: "desc" },
            take: peopleLimit,
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phoneNumber: true
                }
              }
            }
          }),
          prisma.securityLog.findMany({
            where: { tenantId: auth.tenantId, action: "tenant.driver_enrollment_verified" },
            orderBy: { createdAt: "desc" },
            take: 500,
            select: { createdAt: true, metadata: true }
          }),
          prisma.securityLog.findMany({
            where: { tenantId: auth.tenantId, action: "tenant.driver_inspection_invited" },
            orderBy: { createdAt: "desc" },
            take: 500,
            select: { createdAt: true, metadata: true }
          })
        ]);

        const verifiedByRiderId = new Map<string, string>();
        for (const item of verifications) {
          const metadata = item.metadata as { riderId?: string } | null;
          if (!metadata?.riderId || verifiedByRiderId.has(metadata.riderId)) continue;
          verifiedByRiderId.set(metadata.riderId, item.createdAt.toISOString());
        }

        const inviteByRiderId = new Map<string, { at: string; channel: string | null }>();
        for (const item of invites) {
          const metadata = item.metadata as { riderId?: string; channel?: string } | null;
          if (!metadata?.riderId || inviteByRiderId.has(metadata.riderId)) continue;
          inviteByRiderId.set(metadata.riderId, {
            at: item.createdAt.toISOString(),
            channel: metadata.channel ?? null
          });
        }

        return enrollments.map((entry) => {
          const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
          const riderProfileId = typeof metadata.riderProfileId === "string" ? metadata.riderProfileId : null;
          return {
            id: entry.id,
            createdAt: entry.createdAt,
            userId: entry.userId,
            riderProfileId,
            user: entry.user,
            firstName: typeof metadata.firstName === "string" ? metadata.firstName : null,
            middleName: typeof metadata.middleName === "string" ? metadata.middleName : null,
            lastName: typeof metadata.lastName === "string" ? metadata.lastName : null,
            address: typeof metadata.address === "string" ? metadata.address : null,
            phoneNumber: typeof metadata.phoneNumber === "string" ? metadata.phoneNumber : null,
            whatsappNumber: typeof metadata.whatsappNumber === "string" ? metadata.whatsappNumber : null,
            identificationType: typeof metadata.identificationType === "string" ? metadata.identificationType : null,
            dateOfBirth: typeof metadata.dateOfBirth === "string" ? metadata.dateOfBirth : null,
            mothersMaidenName: typeof metadata.mothersMaidenName === "string" ? metadata.mothersMaidenName : null,
            carName: typeof metadata.carName === "string" ? metadata.carName : null,
            carModel: typeof metadata.carModel === "string" ? metadata.carModel : null,
            carYear: typeof metadata.carYear === "number" ? metadata.carYear : null,
            carCondition: typeof metadata.carCondition === "string" ? metadata.carCondition : null,
            vehiclePlate: typeof metadata.vehiclePlate === "string" ? metadata.vehiclePlate : null,
            livenessConfirmed: metadata.livenessConfirmed === true,
            verificationStatus: riderProfileId && verifiedByRiderId.has(riderProfileId) ? "verified" : "pending",
            verifiedAt: riderProfileId ? verifiedByRiderId.get(riderProfileId) ?? null : null,
            invitedAt: riderProfileId ? inviteByRiderId.get(riderProfileId)?.at ?? null : null,
            invitedChannel: riderProfileId ? inviteByRiderId.get(riderProfileId)?.channel ?? null : null
          };
        });
      }, []),

      safe(() => prisma.driverLocationPing.findMany({
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
      }), []),

      safe(() => prisma.driverComplianceDocument.findMany({
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
      }), []),

      safe(() => prisma.notificationLog.findMany({
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
      }), []),

      safe(() => prisma.systemErrorLog.findMany({
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
      }), []),

      safe(() => prisma.securityLog.findMany({
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
      }), []),

      safe(() => prisma.geofenceAlert.findMany({
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
      }), []),

      safe(() => prisma.analyticsSnapshot.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { metricDate: "desc" },
        take: eventsLimit,
        select: {
          id: true,
          metricKey: true,
          metricDate: true,
          metricValue: true
        }
      }), [])
    ]);

    const passengersSafe = passengers.map((passenger) => ({
      ...passenger,
      walletBalanceMinor:
        typeof passenger.walletBalanceMinor === "bigint"
          ? passenger.walletBalanceMinor.toString()
          : passenger.walletBalanceMinor
    }));

    return ok({
      tenant,
      summary,
      activeTrips,
      riders,
      passengers: passengersSafe,
      tripHistory,
      payments,
      complaints,
      supportTickets,
      supportCommunications,
      driverEnrollments,
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
