"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <motion.main
      className="landing"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <section className="hero glass-card">
        <p className="hero-kicker">E-Ride Platform</p>
        <h1>White-label ride operations with enterprise control</h1>
        <p className="page-subtitle">
          Inspired by the design language from your reference repo, now applied directly in this project for super admin and tenant
          operations.
        </p>

        <div className="quick-links">
          <Link className="hero-link hero-link-primary" href="/super-admin/login">
            Super Admin Login
          </Link>
          <Link className="hero-link hero-link-secondary" href="/tenant-admin/login">
            Tenant Admin Login
          </Link>
        </div>
      </section>

      <section className="grid hero-grid">
        <Link className="card hero-card glass-card" href="/super-admin">
          <strong>Platform</strong>
          <p>Super Admin Console</p>
          <span className="muted">Cross-tenant insights, enrollment, profile management, and system controls.</span>
        </Link>
        <Link className="card hero-card glass-card" href="/tenant-admin">
          <strong>Tenant</strong>
          <p>Tenant Operations Console</p>
          <span className="muted">Riders, trip activity, payouts, and support operations in one workspace.</span>
        </Link>
      </section>
    </motion.main>
  );
}
