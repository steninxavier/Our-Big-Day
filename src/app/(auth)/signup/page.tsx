import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getOptionalCurrentUser } from "@/server/auth/current-user";

import SignupForm from "./signup-form";
import styles from "../login/login.module.css";

export const metadata: Metadata = {
  title: "Create your wedding space",
  description: "Create your private Our Big Day wedding-planning account.",
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

export default async function SignupPage() {
  if (await getOptionalCurrentUser()) {
    redirect("/dashboard");
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.editorialPanel} aria-labelledby="join-note-title">
          <div className={styles.editorialMeta}>
            <span>
              <i /> Couple portal
            </span>
            <span>Kerala modernism</span>
            <span>Your first chapter</span>
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
              <span>One calm place to begin</span>
              <span>Private by design</span>
            </div>
          </div>

          <blockquote id="join-note-title">
            “Begin with the details that matter. Your wedding space will grow with every meaningful plan.”
          </blockquote>
          <div className={styles.editorialCredit}>
            <span>Our Big Day</span>
            <span>Made for every ceremony</span>
          </div>
        </section>

        <section className={styles.signInCard} aria-labelledby="sign-up-title">
          <div className={styles.signInTopline}>
            <span className={styles.activeMode}>Create account</span>
            <span>Your secure planning space</span>
            <span className={styles.vaultNote}>Private by design</span>
          </div>

          <Link className={styles.brandLink} href="/" aria-label="Our Big Day home">
            <BrandMark />
          </Link>

          <div className={styles.intro}>
            <p className={styles.eyebrow}>Your wedding begins here</p>
            <h1 id="sign-up-title">Create your space.</h1>
            <p>Set up your account now. We&apos;ll guide you through creating your first wedding next.</p>
          </div>

          <SignupForm />

          <p className={styles.newAccount}>
            Already have an account? <Link href="/login">Sign in <ArrowIcon /></Link>
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
