import { z } from "zod";

export const brandingSchema = z.object({
  appName: z.string().min(2),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
  secondaryColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional()
});
