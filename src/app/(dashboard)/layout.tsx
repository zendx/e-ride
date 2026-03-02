"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Route } from "next";
import { clearClientSession } from "@/lib/auth/client-session";
import "./dashboard-theme.css";
import "@/styles/studio.css";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname.endsWith("/login");
  const isTenant = pathname.startsWith("/tenant-admin");
  const dashboardHome = isTenant ? "/tenant-admin" : "/super-admin";
  const loginHref = isTenant ? "/tenant-admin/login" : "/super-admin/login";
  const navItems: Array<{ href: Route; label: string; icon: string }> = isTenant
    ? [
        { href: "/tenant-admin" as Route, label: "Overview", icon: "fa-gauge-high" },
        { href: "/tenant-admin/login" as Route, label: "Tenant Login", icon: "fa-right-to-bracket" }
      ]
    : [
        { href: "/super-admin" as Route, label: "Overview", icon: "fa-gauge-high" },
        { href: "/super-admin/enroll" as Route, label: "Enroll Tenant", icon: "fa-user-plus" },
        { href: "/super-admin/login" as Route, label: "Super Login", icon: "fa-right-to-bracket" }
      ];

  const crumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, parts) => ({
      href: `/${parts.slice(0, index + 1).join("/")}` as Route,
      label: segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    }));

  function handleLogout() {
    clearClientSession();
    router.push(loginHref);
  }

  if (isLoginPage) {
    return (
      <div id="app" className="app app-full-height app-without-header studio-theme">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div id="app" className="studio-theme dash-shell">
      <aside className="dash-sidebar">
        <Link href={dashboardHome} className="dash-brand">
          <span className="dash-brand-logo">
            <i className="fa-solid fa-car-side" aria-hidden="true"></i>
          </span>
          <span className="dash-brand-text">
            <strong>E-Ride</strong>
            <small>{isTenant ? "Tenant Workspace" : "Platform Console"}</small>
          </span>
        </Link>

        <nav className="dash-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`dash-nav-link ${isActive(pathname, item.href) ? "active" : ""}`}>
              <i className={`fa-solid ${item.icon}`} aria-hidden="true"></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <p>{isTenant ? "Tenant Admin" : "Super Admin"}</p>
          <button type="button" className="dash-signout-btn" onClick={handleLogout}>
            <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <div className="dash-breadcrumbs">
            {crumbs.map((crumb, index) => (
              <span key={crumb.href} className="dash-crumb">
                {index > 0 ? <i className="fa-solid fa-angle-right" aria-hidden="true"></i> : null}
                <Link href={crumb.href}>{crumb.label}</Link>
              </span>
            ))}
          </div>
          <div className="dash-header-user">
            <span className="dash-user-chip">
              <i className="fa-regular fa-circle-user" aria-hidden="true"></i>
              {isTenant ? "tenant-admin" : "super-admin"}
            </span>
            <button type="button" className="dash-header-logout" onClick={handleLogout}>
              <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
              Logout
            </button>
          </div>
        </header>

        <div className="dash-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
