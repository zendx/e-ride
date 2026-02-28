import { z } from "zod";
import { Role } from "@prisma/client";

const hexColorRegex = /^#([0-9A-Fa-f]{6})$/;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const enrollTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(slugRegex),
  appName: z.string().min(2).max(120).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().min(4).max(32).optional(),
  primaryColor: z.string().regex(hexColorRegex).optional(),
  secondaryColor: z.string().regex(hexColorRegex).optional(),
  customDomain: z.string().min(4).max(255).optional(),
  platformCommissionBps: z.number().int().min(0).max(5000).optional(),
  adminFullName: z.string().min(2).max(120),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128)
});

export type EnrollTenantInput = z.infer<typeof enrollTenantSchema>;

export const superAdminProfileUpdateSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(8).max(128).optional(),
  newPassword: z.string().min(8).max(128).optional()
}).refine(
  (value) => !(value.newPassword && !value.currentPassword),
  { message: "currentPassword is required when changing password", path: ["currentPassword"] }
).refine(
  (value) => Boolean(value.fullName || value.email || value.newPassword),
  { message: "At least one field must be provided" }
);

export const createAdminUserSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum([Role.super_admin, Role.support]).default(Role.support)
});

export const superAdminTenantUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().trim().toLowerCase().regex(slugRegex).optional(),
  appName: z.string().min(2).max(120).optional(),
  status: z.string().min(2).max(64).optional(),
  supportEmail: z.string().email().nullable().optional(),
  supportPhone: z.string().min(4).max(32).nullable().optional(),
  primaryColor: z.string().regex(hexColorRegex).optional(),
  secondaryColor: z.string().regex(hexColorRegex).optional(),
  customDomain: z.string().min(4).max(255).nullable().optional(),
  platformCommissionBps: z.number().int().min(0).max(5000).optional()
}).refine(
  (value) => Object.values(value).some((entry) => entry !== undefined),
  { message: "At least one field must be provided" }
);

export type SuperAdminProfileUpdateInput = z.infer<typeof superAdminProfileUpdateSchema>;
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type SuperAdminTenantUpdateInput = z.infer<typeof superAdminTenantUpdateSchema>;
