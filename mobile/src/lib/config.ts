import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

function toTrimmed(value: string | undefined | null) {
  const next = value?.trim();
  return next ? next : "";
}

function getExpoDevHost() {
  const webHost =
    typeof window !== "undefined" && window.location?.hostname
      ? window.location.hostname
      : "";

  const candidates = [
    webHost,
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri,
    (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost,
    (Constants as unknown as { linkingUri?: string }).linkingUri,
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
    (Constants as unknown as { experienceUrl?: string }).experienceUrl,
    (NativeModules as { SourceCode?: { scriptURL?: string } }).SourceCode?.scriptURL
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const clean = candidate.replace(/^(https?|exp):\/\//, "").split("/")[0];
    const host = clean.split(":")[0];
    if (host) return host;
  }
  return "";
}

function normalizeBaseUrl(value: string) {
  const withoutTrailingSlash = value.replace(/\/+$/, "");
  try {
    const parsed = new URL(withoutTrailingSlash);
    const isLocalHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (isLocalHost && Platform.OS !== "web") {
      const devHost = getExpoDevHost();
      if (devHost && devHost !== "localhost" && devHost !== "127.0.0.1") {
        parsed.hostname = devHost;
        return parsed.toString().replace(/\/+$/, "");
      }

      if (Platform.OS === "android") {
        parsed.hostname = "10.0.2.2";
        return parsed.toString().replace(/\/+$/, "");
      }
    }
    return withoutTrailingSlash;
  } catch {
    return withoutTrailingSlash;
  }
}

const envBaseUrl = toTrimmed(process.env.EXPO_PUBLIC_API_BASE_URL);
const extraBaseUrl = toTrimmed(Constants.expoConfig?.extra?.apiBaseUrl as string | undefined);
const fallbackBaseUrl = "http://localhost:3000";

export const API_BASE_URL = normalizeBaseUrl(envBaseUrl || extraBaseUrl || fallbackBaseUrl);
