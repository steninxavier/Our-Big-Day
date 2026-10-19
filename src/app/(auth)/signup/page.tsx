import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getOptionalCurrentUser } from "@/server/auth/current-user";
import { getInvitationEmailForReturn } from "@/server/auth/invitation-email";
import { invitationReturnPath } from "@/shared/auth/invitation-return";

import AuthHeader from "../auth-header";
import SignupForm from "./signup-form";
import styles from "../login/login.module.css";

export const metadata: Metadata = {
  title: "Create your wedding space",
  description: "Create your private Our Big Day wedding-planning account.",
};

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M2.75 8h9.5M8.75 4.5 12.25 8l-3.5 3.5" />
    </svg>
  );
}

export default async function SignupPage({ searchParams }: { searchParams?: Promise<{ next?: string | string[] }> } = {}) {
  const next = invitationReturnPath((await searchParams)?.next);
  if (await getOptionalCurrentUser()) {
    redirect(next ?? "/dashboard");
  }
  const initialEmail = await getInvitationEmailForReturn(next);

  return (
    <>
    <AuthHeader active="signup" next={next} />
    <main className={`${styles.page} ${styles.loginPage}`}>
      <div className={`${styles.shell} ${styles.loginShell}`}>
        <section className={`${styles.editorialPanel} ${styles.loginCover}`} aria-labelledby="join-note-title">
          <div className={styles.loginCoverImage} aria-hidden="true">
            <Image
              src="/login-kasavu-editorial.png"
              alt=""
              fill
              sizes="(max-width: 800px) 1px, 50vw"
              className={styles.loginArtworkImage}
            />
          </div>
          <div className={styles.editorialMeta}>
            <span>
              <i /> Couple portal
            </span>
            <span>Kerala modernism</span>
            <span>Your first chapter</span>
          </div>

          <blockquote id="join-note-title">
            “Begin with the details that matter. Your wedding space will grow with every meaningful plan.”
          </blockquote>
          <div className={styles.editorialCredit}>
            <span>Our Big Day</span>
            <span>Made for every ceremony</span>
          </div>
        </section>

        <div className={styles.loginFormColumn}>
        <section className={styles.signInCard} aria-labelledby="sign-up-title">
          <div className={styles.signInTopline}>
            <span className={styles.activeMode}>Create account</span>
            <span>Your secure planning space</span>
            <span className={styles.vaultNote}>Private by design</span>
          </div>

          <div className={styles.intro}>
            <p className={styles.eyebrow}>Your wedding begins here</p>
            <h1 id="sign-up-title">Create your space.</h1>
            <p>{next ? "Create an account using the email address that received your invitation." : "Set up your account now. We'll guide you through creating your first wedding next."}</p>
          </div>

          <SignupForm key={next ?? "ordinary-signup"} next={next} initialEmail={initialEmail} />

          <p className={styles.newAccount}>
            Already have an account? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Sign in <ArrowIcon /></Link>
          </p>
        </section>
        </div>
      </div>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Our Big Day. All rights reserved.</span>
        <span className={styles.footerQuietly}>A private space for every meaningful detail.</span>
      </footer>
    </main>
    </>
  );
}
