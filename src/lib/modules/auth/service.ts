import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { AppError } from "@/lib/errors/app-error";
import { hash } from "bcryptjs";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: { select: { id: true, slug: true } } }
  });

  if (!user) throw new AppError("Invalid credentials", 401, "invalid_credentials");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401, "invalid_credentials");

  const payload = {
    sub: user.id,
    role: user.role,
    tenantId: user.tenant?.id,
    tenantSlug: user.tenant?.slug
  };

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken(payload)
  ]);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await hash(refreshToken, 10) }
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant?.id,
      tenantSlug: user.tenant?.slug
    }
  };
}

export async function refresh(refreshToken: string) {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload.sub || !payload.role) throw new AppError("Invalid token", 401, "invalid_token");

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { tenant: { select: { id: true, slug: true } } }
  });

  if (!user) throw new AppError("User not found", 404, "user_not_found");

  return {
    accessToken: await signAccessToken({
      sub: user.id,
      role: user.role,
      tenantId: user.tenant?.id,
      tenantSlug: user.tenant?.slug
    })
  };
}
