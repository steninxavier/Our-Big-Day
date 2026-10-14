import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getOptionalCurrentUser } from "@/server/auth/current-user";

import WeddingOnboardingForm from "./wedding-onboarding-form";
import styles from "./wedding-onboarding.module.css";

export const metadata: Metadata = {
  title: "Create your wedding",
  description: "Set up your private Our Big Day wedding space.",
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
      <div className={styles.shell}>
        <section className={styles.storyPanel} aria-labelledby="onboarding-story-title">
          <Link className={styles.brandLink} href="/" aria-label="Our Big Day home">
            <BrandMark />
          </Link>

          <div className={styles.storyContent}>
            <p className={styles.eyebrow}>Your private wedding space</p>
            <h1 id="onboarding-story-title">Begin with the people and place that matter.</h1>
            <p>
              This is the foundation for every event, task, guest, and memory you will plan together.
            </p>
          </div>

          <ol className={styles.steps} aria-label="Wedding setup steps">
            <li className={styles.currentStep}>
              <span>01</span>
              <div>
                <strong>Create your wedding</strong>
                <small>Names, date, and location</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Invite your people</strong>
                <small>Available after setup</small>
              </div>
            </li>
          </ol>

          <p className={styles.storyFootnote}>Your details stay private to your wedding team.</p>
        </section>

        <section className={styles.formPanel} aria-labelledby="onboarding-title">
          <div className={styles.formTopline}>
            <span>Step 1 of 1</span>
            <span>Private by design</span>
          </div>

          <div className={styles.intro}>
            <p className={styles.eyebrow}>Welcome, {currentUser.user.name}.</p>
            <h2 id="onboarding-title">Create your wedding.</h2>
            <p>Start with the essentials. You can refine the finer details later.</p>
          </div>

          <WeddingOnboardingForm />
        </section>
      </div>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Our Big Day. All rights reserved.</span>
        <span>One calm place for every meaningful detail.</span>
      </footer>
    </main>
  );
}
