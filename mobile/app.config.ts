import type { ConfigContext, ExpoConfig } from "expo/config";

function env(name: string, fallback: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: env("EXPO_PUBLIC_APP_NAME", "Cyber Rydes"),
  slug: env("EXPO_PUBLIC_APP_SLUG", "carrygo-mobile"),
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: env("EXPO_PUBLIC_IOS_BUNDLE_ID", "com.carrygo.mobile")
  },
  android: {
    package: env("EXPO_PUBLIC_ANDROID_PACKAGE", "com.carrygo.mobile"),
    adaptiveIcon: {
      backgroundColor: "#0f1f33"
    }
  },
  extra: {
    apiBaseUrl: env("EXPO_PUBLIC_API_BASE_URL", "http://localhost:3000"),
    tenantSlug: env("EXPO_PUBLIC_TENANT_SLUG", "cyber-rydes")
  }
});
