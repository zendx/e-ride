import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { login as loginApi, registerPushToken } from "../lib/api";
import { clearSession, loadSession, saveSession } from "../lib/storage";
import { AppRole, AuthSession } from "../types/auth";
import { Platform } from "react-native";

type AuthContextValue = {
  loading: boolean;
  session: AuthSession | null;
  login: (email: string, password: string, expectedRole?: AppRole) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await loadSession();
      if (mounted) {
        setSession(stored);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function login(email: string, password: string, expectedRole?: AppRole) {
    const payload = await loginApi(email, password);
    if (payload.user.role !== "rider" && payload.user.role !== "passenger") {
      throw new Error("Only rider or passenger accounts can use this mobile app.");
    }
    if (expectedRole && payload.user.role !== expectedRole) {
      throw new Error(`This account is not a ${expectedRole}.`);
    }

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
