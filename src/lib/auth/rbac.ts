import { Role } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";

export function requireRole(userRole: Role, allowed: Role[]) {
  if (!allowed.includes(userRole)) {
    throw new AppError("Forbidden", 403, "forbidden");
  }
}
