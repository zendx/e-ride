import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthSession } from "../types/auth";

const SESSION_KEY = "carrygo_mobile_session";
const SETTINGS_KEY = "carrygo_mobile_settings";

export async function saveSession(session: AuthSession) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export type MobileSettings = {
  profileName?: string;
  profilePhone?: string;
  preferredPaymentMethod?: "card" | "wallet" | "cash";
  notifications?: {
    rideRequests: boolean;
    rideUpdates: boolean;
    promotions: boolean;
  };
};

export async function saveMobileSettings(settings: MobileSettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadMobileSettings() {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MobileSettings;
  } catch {
    return null;
  }
}
