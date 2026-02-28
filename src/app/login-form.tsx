"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { PasswordField } from "@/components/password-field";

type LoginResponse = {
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      role: "super_admin" | "tenant_admin" | "dispatcher" | "rider" | "passenger" | "support";
      email: string;
    };
  };
};

type ErrorResponse = {
  error?: { message?: string };
};

type LoginFormProps = {
  onLoginSuccess?: (payload: LoginResponse["data"]) => void;
};

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("superadmin@carrygo.com");
  const [password, setPassword] = useState("Passw0rd!");
  const [submitting, setSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [role, setRole] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

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
      localStorage.setItem("carrygo_access_token", body.data.accessToken);
      localStorage.setItem("carrygo_refresh_token", body.data.refreshToken);

      setAccessToken(body.data.accessToken);
      setRole(body.data.user.role);
      setMessage(`Logged in as ${body.data.user.email} (${body.data.user.role}). Token saved to localStorage.`);
      onLoginSuccess?.(body.data);
    } catch {
      setError("Network error while logging in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card section">
      <h2>Login</h2>
      <p className="muted">Use your account to get an access token for protected APIs.</p>
      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <PasswordField value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>

      {message ? <p className="status-ok">{message}</p> : null}
      {error ? <p className="status-error">{error}</p> : null}

      {accessToken ? (
        <div style={{ marginTop: 12 }}>
          <p className="muted">Access token preview: {accessToken.slice(0, 32)}...</p>
          {role === "super_admin" ? <Link href="/super-admin">Go to Super Admin Dashboard</Link> : null}
          {role === "tenant_admin" ? <Link href="/tenant-admin">Go to Tenant Admin Dashboard</Link> : null}
        </div>
      ) : null}
    </section>
  );
}
