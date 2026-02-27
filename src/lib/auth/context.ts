import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { AppError } from "@/lib/errors/app-error";

export type AuthContext = {
  userId: string;
  role: string;
  tenantId?: string;
  tenantSlug?: string;
};

export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Missing bearer token", 401, "unauthorized");
  }

  const token = authHeader.slice("Bearer ".length);
  const payload = await verifyAccessToken(token);

  if (!payload.sub || !payload.role) {
    throw new AppError("Invalid token payload", 401, "invalid_token");
  }

  return {
    userId: payload.sub,
    role: payload.role,
    tenantId: payload.tenantId,
    tenantSlug: payload.tenantSlug
  };
}
