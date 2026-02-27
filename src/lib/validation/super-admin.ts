import { z } from "zod";

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
