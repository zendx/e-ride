import { z } from "zod";

export const createTripSchema = z.object({
  pickupAddress: z.string().min(3),
  dropoffAddress: z.string().min(3),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  dropoffLat: z.number().min(-90).max(90),
  dropoffLng: z.number().min(-180).max(180),
  estimatedDistanceKm: z.number().positive(),
  estimatedDurationMin: z.number().int().positive()
});

export const assignTripSchema = z.object({
  tripId: z.string().cuid(),
  riderId: z.string().cuid()
});

export const riderStatusSchema = z.object({
  availability: z.enum(["offline", "online", "on_trip"]),
  lat: z.number().optional(),
  lng: z.number().optional()
});

export const tripStatusUpdateSchema = z.object({
  status: z.enum(["accepted", "arrived", "in_progress", "completed", "cancelled"]),
  cancelReason: z.string().trim().min(3).max(280).optional()
}).superRefine((input, ctx) => {
  if (input.status === "cancelled" && !input.cancelReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "cancelReason is required when status is cancelled",
      path: ["cancelReason"]
    });
  }
});
