import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { requireRole } from "@/lib/auth/rbac";
import { AppError } from "@/lib/errors/app-error";
import { fail, ok } from "@/lib/http";

type Params = {
  params: Promise<{ tenantId: string }>;
};

function parseLimit(input: string | null, fallback: number) {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), 100);
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthContext(request);
    requireRole(auth.role as Role, [Role.super_admin]);

    const { tenantId } = await params;
    if (!tenantId) throw new AppError("Tenant ID is required", 400, "invalid_input");

    const url = new URL(request.url);
    const peopleLimit = parseLimit(url.searchParams.get("peopleLimit"), 25);
    const historyLimit = parseLimit(url.searchParams.get("historyLimit"), 50);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            riders: true,
            passengers: true,
            trips: true,
            transactions: true,
            complaints: true
          }
        }
      }
    });

    if (!tenant) throw new AppError("Tenant not found", 404, "resource_not_found");

    const [riders, passengers, tripHistory, transactions] = await Promise.all([
      prisma.riderProfile.findMany({
        where: { tenantId },
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
        where: { tenantId },
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
        where: { tenantId },
        orderBy: { requestedAt: "desc" },
        take: historyLimit,
        select: {
          id: true,
          status: true,
          pickupAddress: true,
          dropoffAddress: true,
          fareTotalMinor: true,
          requestedAt: true,
          completedAt: true,
          cancelledAt: true,
          rider: { select: { user: { select: { fullName: true } } } },
          passenger: { select: { user: { select: { fullName: true } } } }
        }
      }),

      prisma.paymentTransaction.findMany({
        where: { tenantId },
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
          providerReference: true,
          createdAt: true
        }
      })
    ]);

    return ok({
      tenant,
      riders,
      passengers,
      tripHistory,
      transactions
    });
  } catch (error) {
    return fail(error);
  }
}
