import type { ReactNode } from "react";
import DashboardHeader, { type DashboardSection } from "./dashboard-header";
import styles from "./dashboard-shell.module.css";

export default function DashboardShell({ active, showMembers = true, children }: { active: DashboardSection; showMembers?: boolean; children: ReactNode }) {
  return <div className={styles.shell}><DashboardHeader active={active} showMembers={showMembers} /><div className={styles.content}>{children}</div></div>;
}
