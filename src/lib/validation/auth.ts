import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().trim().toLowerCase().regex(slugRegex).optional()
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(16)
});
