import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const riderRegistrationSchema = z.object({
  tenantSlug: z.string().trim().toLowerCase().regex(slugRegex),
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phoneNumber: z.string().min(4).max(32).optional(),
  licenseNumber: z.string().min(4).max(64),
  vehicleType: z.string().min(2).max(64),
  vehiclePlate: z.string().min(2).max(32),
  vehicleMake: z.string().min(2).max(64).optional(),
  vehicleModel: z.string().min(2).max(64).optional(),
  vehicleColor: z.string().min(2).max(64).optional()
});

export const passengerNearbyRidersSchema = z.object({
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  radiusKm: z.coerce.number().positive().max(25).default(5),
  limit: z.coerce.number().int().positive().max(100).default(30)
});

export const passengerFareEstimateSchema = z.object({
  estimatedDistanceKm: z.number().positive().max(500),
  estimatedDurationMin: z.number().positive().max(1440)
});

export type RiderRegistrationInput = z.infer<typeof riderRegistrationSchema>;
