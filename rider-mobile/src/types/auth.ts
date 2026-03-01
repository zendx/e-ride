export type AppRole = "rider";

export type LoginPayload = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: "super_admin" | "tenant_admin" | "dispatcher" | "rider" | "passenger" | "support";
    tenantId?: string | null;
    tenantSlug?: string | null;
  };
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: AppRole;
    tenantId?: string | null;
    tenantSlug?: string | null;
  };
};
