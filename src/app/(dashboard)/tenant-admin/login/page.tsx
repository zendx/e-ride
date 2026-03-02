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
    <motion.div className="login auth-login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: "easeOut" }}>
      <motion.div className="auth-login-shell auth-login-shell-image" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.32 }}>
        <section className="auth-login-panel-image" aria-hidden="true">
          <div className="auth-brand-icon">
            <i className="fa-solid fa-car-side" aria-hidden="true"></i>
          </div>
          <h2 className="auth-brand-title">
            RideHail<span>Pro</span>
          </h2>
          <p className="auth-brand-copy">
            Tenant operations workspace for dispatch, rider support, and performance monitoring in real time.
          </p>

          <div className="auth-stats">
            <div>
              <strong>50K+</strong>
              <span>Active Riders</span>
            </div>
            <div>
              <strong>3K+</strong>
              <span>Drivers</span>
            </div>
            <div>
              <strong>99.9%</strong>
              <span>Uptime</span>
            </div>
          </div>
        </section>

        <div className="auth-login-card-image">
          <form className="auth-login-form auth-login-form-image" onSubmit={onSubmit}>
            <h1>Welcome back</h1>
            <p className="auth-subtitle">Sign in to your dashboard</p>

            <div className="mb-3">
              <label className="form-label">Tenant Slug</label>
              <div className="auth-input-wrap">
                <i className="fa-solid fa-building" aria-hidden="true"></i>
                <input
                  type="text"
                  className="form-control form-control-lg fs-15px"
                  value={tenantSlug}
                  onChange={(event) => setTenantSlug(event.target.value.trim().toLowerCase())}
                  placeholder="cyber-rydes"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <div className="auth-input-wrap">
                <i className="fa-regular fa-envelope" aria-hidden="true"></i>
                <input
                  type="email"
                  className="form-control form-control-lg fs-15px"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@metrorides.com"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <div className="auth-input-wrap auth-input-wrap-password">
                <i className="fa-solid fa-lock" aria-hidden="true"></i>
                <PasswordField
                  className="form-control form-control-lg fs-15px has-leading-icon"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter any password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-theme btn-lg d-block w-100 fw-500 mb-3" disabled={submitting}>
              {submitting ? "Signing In..." : "Sign In"} <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>

            {error ? <p className="status-error">{error}</p> : null}

            <div className="auth-demo-box">
              <p className="auth-demo-title">Demo Accounts:</p>
              <p>
                <code>admin@ridehail.com</code> <span>Super Admin</span>
              </p>
              <p>
                <code>admin@metrorides.com</code> <span>Tenant Admin</span>
              </p>
              <p>
                <code>admin@citycab.com</code> <span>Tenant Admin</span>
              </p>
            </div>

            <div className="text-center text-muted auth-back-link">
              Back to <Link href="/">Home</Link>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
