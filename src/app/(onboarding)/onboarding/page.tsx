import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import homeStyles from "@/app/home.module.css";
import LogoutButton from "@/app/(dashboard)/dashboard/logout-button";
import { getOptionalCurrentUser } from "@/server/auth/current-user";

import WeddingOnboardingForm from "./wedding-onboarding-form";
import styles from "./wedding-onboarding.module.css";

export const metadata: Metadata = {
  title: "Create your wedding",
  description: "Set up your private Our Big Day wedding space.",
};

function WeddingPathIllustration() {
  return (
    <div
      className={styles.storyMap}
      role="img"
      aria-label="A wedding setup path from names to place to plans."
    >
      <div className={styles.mapHeading}>
        <span>Your wedding path</span>
        <span>Step 01 / 01</span>
      </div>
      <svg className={styles.mapLine} aria-hidden="true" viewBox="0 0 380 120">
        <path d="M20 82C73 82 82 31 130 31c44 0 50 58 97 58 42 0 56-48 133-48" />
        <circle cx="20" cy="82" r="5" />
        <circle cx="130" cy="31" r="5" />
        <circle cx="227" cy="89" r="5" />
        <circle cx="360" cy="41" r="5" />
      </svg>
      <div className={styles.mapLegend}>
        <span>Names</span>
        <span>Place</span>
        <span>Plans</span>
      </div>
    </div>
  );
}

export default async function OnboardingPage() {
  const currentUser = await getOptionalCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.wedding) {
    redirect("/dashboard");
  }

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <Link className={styles.brandLink} href="/" aria-label="Our Big Day home">
            <span className={homeStyles.brandLogo}>
              <span className={homeStyles.brandMark} aria-hidden="true">
                <span className={homeStyles.brandMonogramO}>O</span>
                <span className={homeStyles.brandMonogramDivider} />
                <span className={homeStyles.brandMonogramB}>B</span>
              </span>
              <span className={homeStyles.brandName}>Our <em>Big Day</em></span>
            </span>
          </Link>

          <div className={styles.headerActions}>
            <p className={styles.progressChip}>
              <span className={styles.progressNumber}>1</span>
              <span>New wedding</span>
            </p>
            <LogoutButton
              buttonClassName={styles.signOutButton}
              containerClassName={styles.signOutContainer}
              errorClassName={styles.signOutError}
            />
          </div>
        </header>

        <div className={styles.workspace}>
          <div className={styles.storyPanel}>
            <p className={styles.storyKicker}>
              <span aria-hidden="true" />
              Private couple workspace
            </p>

            <div className={styles.storyContent}>
              <p className={styles.storyTitle}>An intimate space for sacred beginnings.</p>
              <p>
                Root the celebration in a few considered details. Your private space will grow with
                every plan, person, and memory you choose to bring in.
              </p>
            </div>

            <WeddingPathIllustration />

            <p className={styles.storyQuote}>
              “For the people, places, and promises that make the day entirely your own.”
            </p>
          </div>

          <section className={styles.formPanel} aria-labelledby="onboarding-title">
            <div className={styles.formTopline}>
              <span className={styles.formStep}>Step 1 of 1 · Your wedding</span>
              <span>Private by design</span>
            </div>

            <div className={styles.mobileProgress}>
              <span className={styles.mobileProgressNumber}>1</span>
              <span>
                <strong>Your wedding space</strong>
                <small>One thoughtful step to begin.</small>
              </span>
            </div>

            <div className={styles.intro}>
              <p className={styles.eyebrow}>Welcome, {currentUser.user.name}.</p>
              <h1 id="onboarding-title">Tell us about your celebration.</h1>
              <p>A few details will create a private space for your people, plans, and memories.</p>
            </div>

            <WeddingOnboardingForm />
          </section>
        </div>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} Our Big Day. All rights reserved.</span>
          <span>Private, considered, and made for your celebration.</span>
        </footer>
      </div>
    </main>
  );
}
