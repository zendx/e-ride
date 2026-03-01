import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { login as loginApi, refreshAccessToken, registerPushToken } from "../lib/api";
import { clearSession, loadSession, saveSession } from "../lib/storage";
import { AppRole, AuthSession } from "../types/auth";
import { Platform } from "react-native";
import { getConfiguredTenantSlug } from "../lib/tenant";

type AuthContextValue = {
  loading: boolean;
  session: AuthSession | null;
  login: (email: string, password: string, expectedRole?: AppRole) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const APP_TENANT_SLUG = getConfiguredTenantSlug();

function normalizeSlug(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function ensureTenantMatch(tenantSlug?: string | null) {
  if (!APP_TENANT_SLUG) {
    throw new Error("Tenant configuration missing. Set EXPO_PUBLIC_TENANT_SLUG for this app build.");
  }
  if (normalizeSlug(tenantSlug) !== APP_TENANT_SLUG) {
    throw new Error(`This app is restricted to tenant "${APP_TENANT_SLUG}".`);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await loadSession();
      let nextSession: AuthSession | null = stored;
      if (stored) {
        try {
          ensureTenantMatch(stored.user.tenantSlug);
          const refreshedAccessToken = await refreshAccessToken(stored.refreshToken);
          nextSession = {
            ...stored,
            accessToken: refreshedAccessToken
          };
          await saveSession(nextSession);
        } catch {
          await clearSession();
          nextSession = null;
        }
      }
      if (mounted) {
        setSession(nextSession);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const refreshedAccessToken = await refreshAccessToken(session.refreshToken);
          const refreshedSession: AuthSession = {
            ...session,
            accessToken: refreshedAccessToken
          };
          await saveSession(refreshedSession);
          setSession(refreshedSession);
        } catch {
          await clearSession();
          setSession(null);
        }
      })();
    }, 10 * 60 * 1000);

    return () => clearInterval(timer);
  }, [session]);

  async function login(email: string, password: string, expectedRole?: AppRole) {
    const payload = await loginApi(email, password, APP_TENANT_SLUG);
    const roleLabel = (role: AppRole) => (role === "rider" ? "Driver" : "Rider");
    if (payload.user.role !== "rider" && payload.user.role !== "passenger") {
      throw new Error("Only Driver or Rider accounts can use this mobile app.");
    }
    if (expectedRole && payload.user.role !== expectedRole) {
      throw new Error(`This account is not a ${roleLabel(expectedRole)} account.`);
    }
    ensureTenantMatch(payload.user.tenantSlug);

    const nextSession: AuthSession = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: {
        id: payload.user.id,
        email: payload.user.email,
        role: payload.user.role,
        tenantId: payload.user.tenantId,
        tenantSlug: payload.user.tenantSlug
      }
    };

    await saveSession(nextSession);
    setSession(nextSession);

    const pushTokenFromEnv = process.env.EXPO_PUBLIC_PUSH_TOKEN;
    if (pushTokenFromEnv) {
      void registerPushToken(nextSession.accessToken, {
        token: pushTokenFromEnv,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
        appVersion: "0.1.0"
      }).catch(() => undefined);
    }
  }

  async function logout() {
    await clearSession();
    setSession(null);
  }

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    session,
    login,
    logout
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
