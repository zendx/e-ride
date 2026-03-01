export function isAuthOrRoleError(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  const lower = message.toLowerCase();
  return (
    message.includes("(401)") ||
    message.includes("(403)") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden")
  );
}

export function toApiErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}
