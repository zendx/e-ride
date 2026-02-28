"use client";

const ACCESS_TOKEN_KEY = "carrygo_access_token";
const REFRESH_TOKEN_KEY = "carrygo_refresh_token";

type JwtPayload = {
  role?: string;
  exp?: number;
};

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  return atob(normalized + "=".repeat(padding));
}

function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

function isExpired(payload: JwtPayload | null) {
  if (!payload?.exp) return false;
  return payload.exp <= Math.floor(Date.now() / 1000);
}

export function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)?.trim();
  return token || null;
}

export function persistClientSession(accessToken: string, refreshToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearClientSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getRoleFromAccessToken(token: string) {
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (isExpired(payload)) return null;
  return payload?.role ?? null;
}
