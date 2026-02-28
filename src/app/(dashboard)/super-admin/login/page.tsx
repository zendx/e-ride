"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("superadmin@carrygo.com");
  const [password, setPassword] = useState("Passw0rd!");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) return;
    if (getRoleFromAccessToken(token) === "super_admin") {
      router.replace("/super-admin");
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
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const body = (await response.json()) as ErrorResponse;
        setError(body.error?.message ?? `Login failed (${response.status})`);
        return;
      }

      const body = (await response.json()) as LoginResponse;
      if (body.data.user.role !== "super_admin") {
        setError("This account is not a super admin.");
        return;
      }

      persistClientSession(body.data.accessToken, body.data.refreshToken);
      router.push("/super-admin");
    } catch {
      setError("Network error while logging in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <h1>Super Admin Login</h1>
      <p className="page-subtitle">Sign in with a super admin account to open the dashboard.</p>

      <section className="card section">
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="superadmin@carrygo.com"
            />
          </label>
          <label>
            Password
            <PasswordField
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>
        {error ? <p className="status-error">{error}</p> : null}
        <p style={{ marginTop: 12 }}>
          <Link href="/">Back to Home</Link>
        </p>
      </section>
    </main>
  );
}
