import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors/app-error";
import { createAuditLog } from "@/lib/modules/audit/service";

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function getReviewBag(dynamicPricingJson: unknown) {
  const root = asObject(dynamicPricingJson);
  const reviews = asObject(root.reviews);
  return { root, reviews };
}

export async function passengerRatesRider(input: {
  tenantId: string;
  userId: string;
  tripId: string;
  rating: number;
  feedback?: string;
}) {
  const trip = await prisma.trip.findFirst({
    where: { id: input.tripId, tenantId: input.tenantId },
    select: {
      id: true,
      status: true,
      dynamicPricingJson: true,
      passenger: { select: { id: true, userId: true } },
      rider: { select: { id: true, rating: true } }
    }
  });
  if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");
  if (trip.status !== "completed") throw new AppError("Only completed trips can be rated", 409, "trip_not_completed");
  if (trip.passenger.userId !== input.userId) throw new AppError("Trip does not belong to this passenger", 403, "trip_not_owned_by_passenger");
  if (!trip.rider?.id) throw new AppError("Trip has no rider assignment", 409, "trip_rider_missing");

  const { root, reviews } = getReviewBag(trip.dynamicPricingJson);
  if (reviews.passengerToRider) {
    throw new AppError("Passenger rating already submitted", 409, "trip_rating_already_exists");
  }

  const nextReviews = {
    ...reviews,
    passengerToRider: {
      rating: input.rating,
      feedback: input.feedback ?? null,
      ratedAt: new Date().toISOString()
    }
  };
  const nextDynamicPricing = {
    ...root,
    reviews: nextReviews
  };

  const completedTripsByRider = await prisma.trip.count({
    where: { tenantId: input.tenantId, riderId: trip.rider.id, status: "completed" }
  });
  const previousCount = Math.max(0, completedTripsByRider - 1);
  const previousRating = trip.rider.rating;
  const nextRiderRating = Number((((previousRating * previousCount) + input.rating) / Math.max(1, previousCount + 1)).toFixed(2));

  const [updatedTrip] = await prisma.$transaction([
    prisma.trip.update({
      where: { id: trip.id },
      data: {
        dynamicPricingJson: nextDynamicPricing as Prisma.InputJsonValue
      }
    }),
    prisma.riderProfile.update({
      where: { id: trip.rider.id },
      data: { rating: nextRiderRating }
    })
  ]);

  await createAuditLog({
    tenantId: input.tenantId,
    actorUserId: input.userId,
    action: "trip.rated_by_passenger",
    entityType: "trip",
    entityId: trip.id,
    afterJson: { rating: input.rating, feedback: input.feedback }
  });

  return updatedTrip;
}

export async function riderRatesPassenger(input: {
  tenantId: string;
  userId: string;
  tripId: string;
  rating: number;
  feedback?: string;
}) {
  const trip = await prisma.trip.findFirst({
    where: { id: input.tripId, tenantId: input.tenantId },
    select: {
      id: true,
      status: true,
      dynamicPricingJson: true,
      passenger: { select: { id: true, rating: true } },
      rider: { select: { id: true, userId: true } }
    }
  });
  if (!trip) throw new AppError("Trip not found", 404, "trip_not_found");
  if (trip.status !== "completed") throw new AppError("Only completed trips can be rated", 409, "trip_not_completed");
  if (!trip.rider?.id || trip.rider.userId !== input.userId) {
    throw new AppError("Rider is not assigned to this trip", 403, "trip_not_assigned_to_rider");
  }

  const { root, reviews } = getReviewBag(trip.dynamicPricingJson);
  if (reviews.riderToPassenger) {
    throw new AppError("Rider rating already submitted", 409, "trip_rating_already_exists");
  }

  const nextReviews = {
    ...reviews,
    riderToPassenger: {
      rating: input.rating,
      feedback: input.feedback ?? null,
      ratedAt: new Date().toISOString()
    }
  };
  const nextDynamicPricing = {
    ...root,
    reviews: nextReviews
  };

  const completedTripsByPassenger = await prisma.trip.count({
    where: { tenantId: input.tenantId, passengerId: trip.passenger.id, status: "completed" }
  });
  const previousCount = Math.max(0, completedTripsByPassenger - 1);
  const previousRating = trip.passenger.rating;
  const nextPassengerRating = Number((((previousRating * previousCount) + input.rating) / Math.max(1, previousCount + 1)).toFixed(2));

  const [updatedTrip] = await prisma.$transaction([
    prisma.trip.update({
      where: { id: trip.id },
      data: {
        dynamicPricingJson: nextDynamicPricing as Prisma.InputJsonValue
      }
    }),
    prisma.passengerProfile.update({
      where: { id: trip.passenger.id },
      data: { rating: nextPassengerRating }
    })
  ]);

  await createAuditLog({
    tenantId: input.tenantId,
    actorUserId: input.userId,
    action: "trip.rated_by_rider",
    entityType: "trip",
    entityId: trip.id,
    afterJson: { rating: input.rating, feedback: input.feedback }
  });

  return updatedTrip;
}
