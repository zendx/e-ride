import { SignJWT, jwtVerify } from "jose";
import { AppError } from "@/lib/errors/app-error";

const encoder = new TextEncoder();

type JwtPayload = {
  sub: string;
  role: string;
  tenantId?: string;
  tenantSlug?: string;
};

function getAccessSecret() {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new AppError("Missing JWT_ACCESS_SECRET", 500, "config_error");
  return encoder.encode(s);
}

function getRefreshSecret() {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s) throw new AppError("Missing JWT_REFRESH_SECRET", 500, "config_error");
  return encoder.encode(s);
}

export async function signAccessToken(payload: JwtPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_TTL ?? "15m")
    .sign(getAccessSecret());
}

export async function signRefreshToken(payload: JwtPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_TTL ?? "30d")
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string) {
  const out = await jwtVerify<JwtPayload>(token, getAccessSecret());
  return out.payload;
}

export async function verifyRefreshToken(token: string) {
  const out = await jwtVerify<JwtPayload>(token, getRefreshSecret());
  return out.payload;
}
