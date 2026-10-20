"use client";

import Link from "next/link";
import { useState } from "react";
import brandStyles from "@/app/home.module.css";
import LogoutButton from "./logout-button";
import styles from "./dashboard-shell.module.css";

export type DashboardSection = "dashboard" | "events" | "tasks" | "guests" | "expenses" | "vendors" | "members";

const items: { id: DashboardSection; href: string; label: string; icon: string }[] = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: "◫" },
  { id: "events", href: "/dashboard/events", label: "Wedding events", icon: "◇" },
  { id: "tasks", href: "/dashboard/tasks", label: "Tasks", icon: "✓" },
  { id: "guests", href: "/dashboard/guests", label: "Guests", icon: "♧" },
  { id: "expenses", href: "/dashboard/expenses", label: "Expenses", icon: "₹" },
  { id: "vendors", href: "/dashboard/vendors", label: "My vendors", icon: "✦" },
  { id: "members", href: "/dashboard/members", label: "Wedding members", icon: "◎" },
];

export default function DashboardHeader({ active, showMembers = true }: { active: DashboardSection; showMembers?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandRow}>
        <Link href="/dashboard" aria-label="Our Big Day dashboard" className={styles.brandLink} onClick={() => setOpen(false)}>
          <span className={brandStyles.brandLogo}>
            <span className={brandStyles.brandMark} aria-hidden="true">
              <span className={brandStyles.brandMonogramO}>O</span>
              <span className={brandStyles.brandMonogramDivider} />
              <span className={brandStyles.brandMonogramB}>B</span>
            </span>
            <span className={brandStyles.brandName}>Our <em>Big Day</em></span>
          </span>
        </Link>
        <button type="button" className={styles.menuToggle} aria-expanded={open} aria-controls="wedding-menu" onClick={() => setOpen((value) => !value)}>
          <span aria-hidden="true">{open ? "×" : "☰"}</span> {open ? "Close menu" : "Menu"}
        </button>
      </div>
      <div id="wedding-menu" className={`${styles.menu} ${open ? styles.menuOpen : ""}`}>
        <p className={styles.navLabel}>Your wedding space</p>
        <nav aria-label="Wedding navigation">
          {items.filter((item) => showMembers || (item.id !== "members" && item.id !== "guests" && item.id !== "expenses" && item.id !== "vendors")).map((item) => (
            <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined} className={`${styles.navLink} ${active === item.id ? styles.activeLink : ""}`} onClick={() => setOpen(false)}>
              <span className={styles.navIcon} aria-hidden="true">{item.icon}</span><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <p>Thoughtfully planning the moments that matter.</p>
          <LogoutButton buttonClassName={styles.signOut} containerClassName={styles.signOutContainer} errorClassName={styles.signOutError} />
        </div>
      </div>
    </aside>
  );
}
