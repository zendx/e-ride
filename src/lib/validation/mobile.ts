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

export const tripHistoryQuerySchema = z.object({
  status: z.enum(["requested", "assigned", "accepted", "arrived", "in_progress", "completed", "cancelled"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export const pushTokenSchema = z.object({
  token: z.string().min(10).max(512),
  platform: z.enum(["ios", "android", "web"]),
  appVersion: z.string().min(1).max(64).optional()
});

export const riderLocationPingSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  heading: z.number().gte(0).lte(360).optional(),
  speedKph: z.number().gte(0).lte(300).optional(),
  accuracyMeters: z.number().gte(0).lte(10000).optional(),
  tripId: z.string().cuid().optional()
});

export const tripRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().min(3).max(500).optional()
});

export const mobilePreferencesSchema = z.object({
  profileName: z.string().trim().min(2).max(120).optional(),
  profilePhone: z.string().trim().min(4).max(32).optional(),
  preferredPaymentMethod: z.enum(["card", "wallet", "cash"]).optional(),
  notifications: z.object({
    rideRequests: z.boolean(),
    rideUpdates: z.boolean(),
    promotions: z.boolean()
  }).optional()
});

export const supportTicketCreateSchema = z.object({
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(8).max(2000),
  priority: z.enum(["low", "normal", "high"]).default("normal")
});

export const supportTicketMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000)
});

export const tripChatMessageSchema = z.object({
  body: z.string().trim().min(1).max(1000)
});

export type RiderRegistrationInput = z.infer<typeof riderRegistrationSchema>;
