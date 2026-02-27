import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";

export async function captureTripPayment(tenantId: string, tripId: string, method: "wallet" | "card" | "cash" = "card") {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, tenantId } });
  if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");
  if (trip.status !== "completed") throw new AppError("Trip is not completed", 409, "trip_not_completed");

  const payment = await prisma.paymentTransaction.upsert({
    where: { tripId },
    update: {
      method,
      status: "captured",
      amountMinor: trip.fareTotalMinor,
      commissionMinor: trip.commissionMinor
    },
    create: {
      tenantId,
      tripId,
      method,
      status: "captured",
      amountMinor: trip.fareTotalMinor,
      commissionMinor: trip.commissionMinor
    }
  });

  return payment;
}
