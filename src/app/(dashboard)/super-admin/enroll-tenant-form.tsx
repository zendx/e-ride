"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PasswordField } from "@/components/password-field";

type EnrollmentPayload = {
  name: string;
  slug: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  appName?: string;
  supportEmail?: string;
  supportPhone?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  platformCommissionBps?: number;
};

const INITIAL_STATE: EnrollmentPayload = {
  name: "",
  slug: "",
  adminFullName: "",
  adminEmail: "",
  adminPassword: "",
  appName: "",
  supportEmail: "",
  supportPhone: "",
  primaryColor: "#0EA5E9",
  secondaryColor: "#0F172A",
  customDomain: "",
  platformCommissionBps: 1500
};

export function EnrollTenantForm() {
  const [accessToken, setAccessToken] = useState("");
  const [payload, setPayload] = useState<EnrollmentPayload>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const submitDisabled = useMemo(() => {
    return (
      isSubmitting ||
      !accessToken.trim() ||
      !payload.name.trim() ||
      !payload.slug.trim() ||
      !payload.adminFullName.trim() ||
      !payload.adminEmail.trim() ||
      !payload.adminPassword.trim()
    );
  }, [accessToken, isSubmitting, payload]);

  useEffect(() => {
    const storedToken = localStorage.getItem("carrygo_access_token");
    if (storedToken) setAccessToken(storedToken);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const token = accessToken.trim().replace(/^Bearer\s+/i, "");
      const response = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...payload,
          slug: payload.slug.trim().toLowerCase(),
          name: payload.name.trim(),
          adminFullName: payload.adminFullName.trim(),
          adminEmail: payload.adminEmail.trim().toLowerCase(),
          appName: payload.appName?.trim() || undefined,
          supportEmail: payload.supportEmail?.trim() || undefined,
          supportPhone: payload.supportPhone?.trim() || undefined,
          customDomain: payload.customDomain?.trim() || undefined,
          primaryColor: payload.primaryColor?.trim() || undefined,
          secondaryColor: payload.secondaryColor?.trim() || undefined,
          platformCommissionBps: payload.platformCommissionBps || undefined
        })
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: { message?: string } };
        setResult({
          ok: false,
          message: body.error?.message ?? `Request failed (${response.status})`
        });
        return;
      }

      const body = (await response.json()) as {
        data: { tenant: { name: string; slug: string }; tenantAdmin: { email: string } };
      };
      setResult({
        ok: true,
        message: `Tenant ${body.data.tenant.name} (${body.data.tenant.slug}) enrolled. Admin: ${body.data.tenantAdmin.email}`
      });
      setPayload(INITIAL_STATE);
    } catch {
      setResult({ ok: false, message: "Network error while enrolling tenant." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h2>Enroll Tenant</h2>
      <p className="muted">Use a super-admin access token to create tenant + tenant admin.</p>

      <form onSubmit={onSubmit} className="form-grid">
        <label className="form-label">
          Access Token
          <PasswordField
            className="form-control"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            placeholder="JWT access token"
          />
        </label>

        <label className="form-label">
          Tenant Name
          <input
            className="form-control"
            value={payload.name}
            onChange={(event) => setPayload({ ...payload, name: event.target.value })}
            placeholder="Gamma Rides"
          />
        </label>

        <label className="form-label">
          Tenant Slug
          <input
            className="form-control"
            value={payload.slug}
            onChange={(event) => setPayload({ ...payload, slug: event.target.value })}
            placeholder="gamma-rides"
          />
        </label>

        <label className="form-label">
          Admin Full Name
          <input
            className="form-control"
            value={payload.adminFullName}
            onChange={(event) => setPayload({ ...payload, adminFullName: event.target.value })}
            placeholder="Gamma Admin"
          />
        </label>

        <label className="form-label">
          Admin Email
          <input
            className="form-control"
            type="email"
            value={payload.adminEmail}
            onChange={(event) => setPayload({ ...payload, adminEmail: event.target.value })}
            placeholder="admin@gamma-rides.com"
          />
        </label>

        <label className="form-label">
          Admin Password
          <PasswordField
            className="form-control"
            value={payload.adminPassword}
            onChange={(event) => setPayload({ ...payload, adminPassword: event.target.value })}
            placeholder="StrongPass123"
          />
        </label>

        <label className="form-label">
          App Name
          <input
            className="form-control"
            value={payload.appName}
            onChange={(event) => setPayload({ ...payload, appName: event.target.value })}
            placeholder="GammaGo"
          />
        </label>

        <label className="form-label">
          Support Email
          <input
            className="form-control"
            type="email"
            value={payload.supportEmail}
            onChange={(event) => setPayload({ ...payload, supportEmail: event.target.value })}
            placeholder="support@gamma-rides.com"
          />
        </label>

        <label className="form-label">
          Support Phone
          <input
            className="form-control"
            value={payload.supportPhone}
            onChange={(event) => setPayload({ ...payload, supportPhone: event.target.value })}
            placeholder="+1000000"
          />
        </label>

        <label className="form-label">
          Primary Color
          <input
            className="form-control"
            value={payload.primaryColor}
            onChange={(event) => setPayload({ ...payload, primaryColor: event.target.value })}
            placeholder="#0EA5E9"
          />
        </label>

        <label className="form-label">
          Secondary Color
          <input
            className="form-control"
            value={payload.secondaryColor}
            onChange={(event) => setPayload({ ...payload, secondaryColor: event.target.value })}
            placeholder="#0F172A"
          />
        </label>

        <label className="form-label">
          Custom Domain
          <input
            className="form-control"
            value={payload.customDomain}
            onChange={(event) => setPayload({ ...payload, customDomain: event.target.value })}
            placeholder="rides.example.com"
          />
        </label>

        <label className="form-label">
          Platform Commission (bps)
          <input
            className="form-control"
            type="number"
            min={0}
            max={5000}
            value={payload.platformCommissionBps ?? 1500}
            onChange={(event) =>
              setPayload({
                ...payload,
                platformCommissionBps: Number.isNaN(Number(event.target.value))
                  ? 1500
                  : Number(event.target.value)
              })
            }
          />
        </label>

        <button type="submit" className="btn btn-outline-theme fw-500" disabled={submitDisabled}>
          {isSubmitting ? "Enrolling..." : "Enroll Tenant"}
        </button>
      </form>

      {result ? (
        <p className={result.ok ? "status-ok" : "status-error"}>{result.message}</p>
      ) : null}
    </section>
  );
}
