"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PasswordField } from "@/components/password-field";
import { getRoleFromAccessToken, getStoredAccessToken, persistClientSession } from "@/lib/auth/client-session";

type LoginResponse = {
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      role: "super_admin" | "tenant_admin" | "dispatcher" | "rider" | "passenger" | "support";
      email: string;
    };
  };
};

type ErrorResponse = {
  error?: { message?: string };
};

export default function TenantAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("cyber-rydes");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    if (getRoleFromAccessToken(token) === "tenant_admin") {
      router.replace("/tenant-admin");
    }
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, tenantSlug })
      });

      if (!response.ok) {
        const body = (await response.json()) as ErrorResponse;
        setError(body.error?.message ?? `Login failed (${response.status})`);
        return;
      }

      const body = (await response.json()) as LoginResponse;
      if (body.data.user.role !== "tenant_admin") {
        setError("This account is not a tenant admin.");
        return;
      }

      persistClientSession(body.data.accessToken, body.data.refreshToken);
      router.push("/tenant-admin");
    } catch {
      setError("Network error while logging in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div className="rh-auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <div className="rh-auth-brand">
        <div className="rh-auth-glow"></div>
        <div className="rh-auth-brand-inner">
          <div className="rh-auth-logo">
            <i className="fa-solid fa-car-side" aria-hidden="true"></i>
          </div>
          <h1>
            RideHail<span>Pro</span>
          </h1>
          <p>The complete white-label ride hailing platform. Manage tenants, riders, and drivers from one powerful dashboard.</p>
          <div className="rh-auth-stats">
            <div><strong>50K+</strong><span>Active Riders</span></div>
            <div><strong>3K+</strong><span>Drivers</span></div>
            <div><strong>99.9%</strong><span>Uptime</span></div>
          </div>
        </div>
      </div>

      <div className="rh-auth-form-pane">
        <form className="rh-auth-form" onSubmit={onSubmit}>
          <h2>Welcome back</h2>
          <p>Sign in to your dashboard</p>

          <input type="hidden" value={tenantSlug} readOnly />

          <label>Email</label>
          <div className="rh-field">
            <i className="fa-regular fa-envelope" aria-hidden="true"></i>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@metrorides.com" required />
          </div>

          <label>Password</label>
          <div className="rh-field rh-field-password">
            <i className="fa-solid fa-lock" aria-hidden="true"></i>
            <PasswordField value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter any password" required />
          </div>

          <button type="submit" className="rh-submit" disabled={submitting}>
            {submitting ? "Signing In..." : "Sign In"} <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>

          {error ? <p className="status-error">{error}</p> : null}

          <div className="rh-demo">
            <h3>Demo Accounts:</h3>
            <p><code>admin@ridehail.com</code> - Super Admin</p>
            <p><code>admin@metrorides.com</code> - Tenant Admin</p>
            <p><code>admin@citycab.com</code> - Tenant Admin</p>
          </div>

          <p className="rh-back">Back to <Link href="/">Home</Link></p>
        </form>
      </div>
    </motion.div>
  );
}
