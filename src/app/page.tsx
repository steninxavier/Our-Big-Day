import type { Metadata } from "next";
import Link from "next/link";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Plan together. Celebrate fully.",
  description:
    "A calmer, more connected way for Indian families to plan, coordinate, and celebrate a wedding.",
};

const planningBenefits = [
  {
    title: "Event choreography",
    description:
      "Bring every ceremony, detail, and decision into one graceful shared plan.",
    icon: "calendar",
  },
  {
    title: "Shared financials",
    description:
      "Keep contributions, budgets, and payments clear for everyone involved.",
    icon: "path",
  },
  {
    title: "Private photo vault",
    description:
      "Collect the moments that matter in one private place for your closest people.",
    icon: "gallery",
  },
];

function BrandLogo({ footer = false }: { footer?: boolean }) {
  return (
    <span className={`${styles.brandLogo} ${footer ? styles.footerBrandLogo : ""}`}>
      <span className={styles.brandMark} aria-hidden="true">
        <span className={styles.brandMonogramO}>O</span>
        <span className={styles.brandMonogramDivider} />
        <span className={styles.brandMonogramB}>B</span>
      </span>
      <span className={styles.brandType}>
        <span className={styles.brandName}>
          Our <em>Big Day</em>
        </span>
        <span className={styles.brandDescriptor}>Wedding planning</span>
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

function BenefitIcon({ icon }: { icon: string }) {
  if (icon === "calendar") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
        <path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17M8 14h3M8 17h6" />
      </svg>
    );
  }

  if (icon === "gallery") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <circle cx="9" cy="10" r="1.75" />
        <path d="m5.5 17 4.3-4.2 3.15 2.9 2.2-2 3.35 3.3" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 18.5c2.4-6.6 5.3-8.1 8.1-8.1 2.3 0 3.6 1.1 5.9 4.1" />
      <path d="M5 12.5c2.3 0 4.1 1.5 5.6 3.8 1.4 2.1 3.3 3.2 6.4 3.2" />
      <circle cx="5" cy="18.5" r="1.5" />
      <circle cx="19" cy="14.5" r="1.5" />
    </svg>
  );
}

function PlannerPreview() {
  return (
    <div className={styles.previewFrame} aria-label="Illustration of the wedding planning workspace">
      <div className={styles.previewTopBar}>
        <span className={styles.previewTopBrand}>OUR BIG DAY</span>
        <span className={styles.previewTopTitle}>Wedding planning</span>
        <span className={styles.previewTopBadge}>Aarya &amp; Dev</span>
      </div>
      <div className={styles.previewBody}>
        <aside className={styles.previewSidebar}>
          <div className={styles.previewBrand}>
            <span>OUR BIG DAY</span>
          </div>
          <span className={styles.previewWedding}>Aarya &amp; Dev</span>
          <ul aria-hidden="true">
            <li className={styles.previewActive}>Overview</li>
            <li>Events</li>
            <li>Guests</li>
            <li>Tasks</li>
            <li>Vendors</li>
          </ul>
          <div className={styles.previewProfile}>
            <span className={styles.previewAvatar}>A</span>
            <span>Aarya Menon</span>
          </div>
        </aside>
        <div className={styles.previewContent}>
          <div className={styles.previewHeading}>
            <div>
              <span>YOUR WEDDING</span>
              <strong>Good morning, Aarya</strong>
            </div>
            <button type="button" tabIndex={-1}>
              Add event
            </button>
          </div>
          <div className={styles.previewStats} aria-hidden="true">
            <div>
              <span>Countdown</span>
              <strong>86 days</strong>
              <small>14 Feb 2027</small>
            </div>
            <div>
              <span>Guests</span>
              <strong>184</strong>
              <small>63 RSVPs received</small>
            </div>
            <div>
              <span>Tasks</span>
              <strong>12</strong>
              <small>3 need attention</small>
            </div>
          </div>
          <div className={styles.previewGrid}>
            <section>
              <div className={styles.previewSectionTitle}>
                <strong>Coming up</strong>
                <span>View calendar</span>
              </div>
              <div className={styles.previewEvent}>
                <div className={styles.previewDate}>
                  <span>DEC</span>
                  <strong>07</strong>
                </div>
                <div>
                  <strong>Family celebration</strong>
                  <span>6:30 PM · The Courtyard</span>
                </div>
                <i>Confirmed</i>
              </div>
              <div className={styles.previewEvent}>
                <div className={styles.previewDate}>
                  <span>JAN</span>
                  <strong>29</strong>
                </div>
                <div>
                  <strong>Mehendi evening</strong>
                  <span>5:00 PM · Home garden</span>
                </div>
                <i>Planning</i>
              </div>
            </section>
            <section className={styles.previewTasks}>
              <div className={styles.previewSectionTitle}>
                <strong>Planning pulse</strong>
                <span>See tasks</span>
              </div>
              <div>
                <span>Guest invitations</span>
                <strong>78%</strong>
              </div>
              <div className={styles.progressTrack}>
                <span />
              </div>
              <div>
                <span>Vendor confirmations</span>
                <strong>56%</strong>
              </div>
              <div className={`${styles.progressTrack} ${styles.progressGold}`}>
                <span />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brandLink} href="/" aria-label="Our Big Day home">
          <BrandLogo />
        </Link>
        <nav className={styles.navigation} aria-label="Primary navigation">
          <Link href="/login">Sign in</Link>
          <Link className={styles.navCta} href="/signup">
            Start planning
            <ArrowIcon />
          </Link>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <h1 id="hero-title">
          Plan together.
          <span>Celebrate fully.</span>
        </h1>
        <p className={styles.heroCopy}>
          A calm, thoughtful place for your family to organise the details, welcome every guest, and keep the joy in view.
        </p>
        <Link className={styles.primaryCta} href="/signup">
          Begin planning
          <ArrowIcon />
        </Link>
      </section>

      <section className={styles.workspaceSection} id="planning" aria-labelledby="workspace-title">
        <div className={styles.sectionIntro}>
          <h2 id="workspace-title">Command Center</h2>
          <p>
            Everything you need to plan with clarity, shared with everyone who matters.
          </p>
        </div>
        <PlannerPreview />
      </section>

      <section className={styles.benefitsSection} id="how-it-works" aria-labelledby="benefits-title">
        <div className={styles.sectionIntro}>
          <h2 id="benefits-title">Simplicity by design.</h2>
          <p>
            A quieter, more thoughtful way to keep every part of the celebration moving together.
          </p>
        </div>
        <div className={styles.benefitGrid}>
          {planningBenefits.map((benefit) => (
            <article className={styles.benefitCard} key={benefit.title}>
              <span className={styles.benefitIcon}>
                <BenefitIcon icon={benefit.icon} />
              </span>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.invitationSection} aria-labelledby="invitation-title">
        <h2 id="invitation-title">Your wedding space awaits.</h2>
        <p>
          A calm shared home for every detail, decision, and memory ahead.
        </p>
        <Link className={styles.goldCta} href="/signup">
          Start planning
          <ArrowIcon />
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerMain}>
          <div className={styles.footerIdentity}>
            <Link className={styles.brandLink} href="/" aria-label="Our Big Day home">
              <BrandLogo footer />
            </Link>
            <p>A thoughtful shared home for every wedding detail, decision, and memory.</p>
          </div>
          <nav className={styles.footerSection} aria-label="Explore Our Big Day">
            <span>Explore</span>
            <a href="#planning">Command Center</a>
            <a href="#how-it-works">How it works</a>
          </nav>
          <nav className={styles.footerSection} aria-label="Our Big Day account">
            <span>Account</span>
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Start planning</Link>
          </nav>
        </div>
        <div className={styles.footerBaseline}>
          <span>© 2026 Our Big Day. All rights reserved.</span>
          <nav aria-label="Legal and support">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
