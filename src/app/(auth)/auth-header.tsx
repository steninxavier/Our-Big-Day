import Link from "next/link";

import homeStyles from "@/app/home.module.css";
import styles from "./login/login.module.css";

export default function AuthHeader({ active, next }: { active: "login" | "signup"; next: string | undefined }) {
  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <header className={styles.headerArea}>
      <div className={homeStyles.header}>
        <Link className={homeStyles.brandLink} href="/" aria-label="Our Big Day home">
          <span className={homeStyles.brandLogo}>
            <span className={homeStyles.brandMark} aria-hidden="true">
              <span className={homeStyles.brandMonogramO}>O</span>
              <span className={homeStyles.brandMonogramDivider} />
              <span className={homeStyles.brandMonogramB}>B</span>
            </span>
            <span className={homeStyles.brandName}>Our <em>Big Day</em></span>
          </span>
        </Link>
        <nav className={homeStyles.navigation} aria-label="Account navigation">
          <Link href={`/login${suffix}`} aria-current={active === "login" ? "page" : undefined}>Sign in</Link>
          <Link className={homeStyles.navCta} href={`/signup${suffix}`} aria-current={active === "signup" ? "page" : undefined}>Start planning <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M2.75 8h9.5M8.75 4.5 12.25 8l-3.5 3.5" /></svg></Link>
        </nav>
      </div>
    </header>
  );
}
