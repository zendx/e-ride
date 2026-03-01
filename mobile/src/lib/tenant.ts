import Constants from "expo-constants";

function toSlug(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase();
}

export function getConfiguredTenantSlug() {
  const envSlug = toSlug(process.env.EXPO_PUBLIC_TENANT_SLUG);
  const defaultEnvSlug = toSlug(process.env.EXPO_PUBLIC_DEFAULT_TENANT_SLUG);
  const extraSlug = toSlug((Constants.expoConfig?.extra?.tenantSlug as string | undefined) ?? "");
  return envSlug || defaultEnvSlug || extraSlug || "cyber-rydes";
}
