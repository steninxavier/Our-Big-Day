import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getOptionalCurrentUser } from "@/server/auth/current-user";
import { invitationReturnPath } from "@/shared/auth/invitation-return";

import LoginForm from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Couple sign in",
  description: "Sign in to your private Our Big Day wedding space.",
};

function BrandMark() {
  return (
    <span className={styles.brand} aria-label="Our Big Day">
      <span className={styles.brandMonogram} aria-hidden="true">
        <span>O</span>
        <i />
        <span>B</span>
      </span>
      <span className={styles.brandName}>
        Our <em>Big Day</em>
      </span>
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M2.75 8h9.5M8.75 4.5 12.25 8l-3.5 3.5" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ next?: string | string[] }> } = {}) {
  const next = invitationReturnPath((await searchParams)?.next);
  if (await getOptionalCurrentUser()) {
    redirect(next ?? "/dashboard");
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.editorialPanel} aria-labelledby="portal-note-title">
          <div className={styles.editorialMeta}>
            <span>
              <i /> Couple portal
            </span>
            <span>Kerala modernism</span>
            <span>Tithi · muhurtham</span>
          </div>

          <div className={styles.artwork} aria-hidden="true">
            <div className={styles.artworkBrass} />
            <div className={styles.artworkWeave} />
            <div className={styles.artworkGarland}>
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className={styles.artworkCaption}>
              <span>Purity, ritual &amp; heritage</span>
              <span>Private chamber</span>
            </div>
          </div>

          <blockquote id="portal-note-title">
            “A calm, private sanctuary for your sacred ceremonies and family gatherings.”
          </blockquote>
          <div className={styles.editorialCredit}>
            <span>Malavika &amp; Arjun</span>
            <span>Est. 2025 · Kovalom</span>
          </div>
        </section>

        <section className={styles.signInCard} aria-labelledby="sign-in-title">
          <div className={styles.signInTopline}>
            <span className={styles.activeMode}>Standard sign in</span>
            <span>Private, server-secured access</span>
            <span className={styles.vaultNote}>Private by design</span>
          </div>

          <Link className={styles.brandLink} href="/" aria-label="Our Big Day home">
            <BrandMark />
          </Link>

          <div className={styles.intro}>
            <p className={styles.eyebrow}>Your wedding space</p>
            <h1 id="sign-in-title">Welcome back.</h1>
            <p>Sign in to continue planning your day, together.</p>
          </div>

          <LoginForm next={next} />

          <p className={styles.newAccount}>
            New to Our Big Day? <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>Create your wedding space <ArrowIcon /></Link>
          </p>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Our Big Day. All rights reserved.</span>
        <span className={styles.footerQuietly}>A private space for every meaningful detail.</span>
      </footer>
    </main>
  );
}
