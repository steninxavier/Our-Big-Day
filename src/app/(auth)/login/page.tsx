import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getOptionalCurrentUser } from "@/server/auth/current-user";
import { getInvitationEmailForReturn } from "@/server/auth/invitation-email";
import { invitationReturnPath } from "@/shared/auth/invitation-return";

import AuthHeader from "../auth-header";
import LoginForm from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Couple sign in",
  description: "Sign in to your private Our Big Day wedding space.",
};

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
  const initialEmail = await getInvitationEmailForReturn(next);

  return (
    <>
    <AuthHeader active="login" next={next} />
    <main className={`${styles.page} ${styles.loginPage}`}>
      <div className={`${styles.shell} ${styles.loginShell}`}>
        <section className={`${styles.editorialPanel} ${styles.loginCover}`} aria-labelledby="portal-note-title">
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
            <span>Tithi · muhurtham</span>
          </div>

          <blockquote id="portal-note-title">
            “A calm, private sanctuary for your sacred ceremonies and family gatherings.”
          </blockquote>
          <div className={styles.editorialCredit}>
            <span>Malavika &amp; Arjun</span>
            <span>Est. 2025 · Kovalom</span>
          </div>
        </section>

        <div className={styles.loginFormColumn}>
        <section className={styles.signInCard} aria-labelledby="sign-in-title">
          <div className={styles.signInTopline}>
            <span className={styles.activeMode}>Standard sign in</span>
            <span>Private, server-secured access</span>
            <span className={styles.vaultNote}>Private by design</span>
          </div>

          <div className={styles.intro}>
            <p className={styles.eyebrow}>Your wedding space</p>
            <h1 id="sign-in-title">Welcome back.</h1>
            <p>Sign in to continue planning your day, together.</p>
          </div>

          <LoginForm key={next ?? "ordinary-login"} next={next} initialEmail={initialEmail} />

          <p className={styles.newAccount}>
            New to Our Big Day? <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>Create your wedding space <ArrowIcon /></Link>
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
