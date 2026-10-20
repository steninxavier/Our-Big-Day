import Link from "next/link";
import { redirect } from "next/navigation";

import brandStyles from "@/app/home.module.css";
import { listPendingMemberInvitations, listWeddingMembers } from "@/modules/members/member-directory.service";
import { listEvents, upcomingEventsOnly } from "@/modules/events/event.service";
import { listGuests } from "@/modules/guests/guest.service";
import { expenseSummary } from "@/modules/expenses/expense.service";
import { getOptionalCurrentUser } from "@/server/auth/current-user";
import { memberRoleLabel } from "@/shared/auth/member-roles";

import DashboardShell from "./dashboard-shell";
import styles from "./dashboard.module.css";

export const metadata = { title: "Dashboard" };

const overview = [
  { title: "Upcoming events", icon: "✦", detail: "Ceremonies & celebrations" },
  { title: "Planning tasks", icon: "✓", detail: "Your planning checklist" },
  { title: "Guest parties", icon: "◎", detail: "Your guest list" },
  { title: "Recorded expenses", icon: "₹", detail: "Your wedding finances" },
];

function formatWeddingDate(date: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export default async function DashboardPage() {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) redirect("/login");
  if (!currentUser.wedding || !currentUser.membership) redirect("/onboarding");

  const { user, wedding, membership } = currentUser;
  const firstName = user.name.trim().split(/\s+/)[0] || "there";
  const isAdmin = membership.role === "ADMIN";
  const canViewMembers = isAdmin || membership.role === "MANAGER";
  const [members, invitations, events, guests, expenses] = await Promise.all([
    canViewMembers ? listWeddingMembers(user.id) : Promise.resolve([]),
    isAdmin ? listPendingMemberInvitations(user.id) : Promise.resolve([]),
    listEvents(user.id),
    canViewMembers ? listGuests(user.id, { page: 1, limit: 1 }) : Promise.resolve(null),
    canViewMembers ? expenseSummary(user.id) : Promise.resolve(null),
  ]);
  const upcomingEvents = upcomingEventsOnly(events);

  return (
    <DashboardShell active="dashboard" showMembers={canViewMembers}>
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="welcome-heading">
          <div>
            <p className={styles.eyebrow}><span aria-hidden="true">✦</span> Private wedding space <span className={styles.role}>· {memberRoleLabel(membership.role)} access</span></p>
            <h1 id="welcome-heading">Welcome back, {firstName}.</h1>
            <p className={styles.weddingName}>{wedding.brideName} &amp; {wedding.groomName}</p>
            <p className={styles.heroDescription}>A little more organised, a little closer to your big day.</p>
          </div>
          <div className={styles.dateCard}>
            <span className={styles.dateIcon} aria-hidden="true">✦</span>
            <div><span className={styles.dateLabel}>The celebration</span><p>{formatWeddingDate(wedding.weddingDate)}</p></div>
          </div>
        </section>

        {canViewMembers ? (
          <>
            <section className={styles.overview} aria-label="Wedding overview">
              {overview.map((item) => <article className={styles.statCard} key={item.title}>
                <div className={styles.statTop}><h2>{item.title}</h2><span className={styles.icon} aria-hidden="true">{item.icon}</span></div>
                <p className={styles.statValue}>{item.title === "Upcoming events" ? upcomingEvents.length : item.title === "Planning tasks" ? "Available" : item.title === "Guest parties" ? guests?.summary.total ?? 0 : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format((expenses?.totalExpensePaise ?? 0) / 100)}</p><p className={styles.muted}>{item.detail}</p>
              </article>)}
            </section>
            <div className={styles.columns}>
              <div className={styles.stack}>
                <section className={styles.panel} aria-labelledby="events-heading">
                  <div className={styles.panelHeading}><div><h2 id="events-heading">Upcoming ceremonies &amp; rituals</h2><p>Every celebration, thoughtfully brought together.</p></div><Link href="/dashboard/events" className={styles.textLink}>View events →</Link></div>
                  {upcomingEvents.length ? <ul className={styles.memberList}>{upcomingEvents.slice(0, 3).map((event) => <li key={event.id}><div className={styles.memberName}><strong>{event.name}</strong><span>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: wedding.timeZone }).format(new Date(event.startsAt))} ({wedding.timeZone})</span></div></li>)}</ul> : <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">✦</span><div><h3>Your celebrations, all in one place</h3><p>Your upcoming events will appear here.</p></div></div>}
                </section>
                <section className={styles.panel} aria-labelledby="tasks-heading">
                  <div className={styles.panelHeading}><div><h2 id="tasks-heading">Your next tasks</h2><p>Small steps towards a beautiful day.</p></div><Link href="/dashboard/tasks" className={styles.textLink}>View tasks →</Link></div>
                  <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">✓</span><div><h3>Make room for what matters</h3><p>Organise your preparations on the tasks page.</p></div></div>
                </section>
              </div>
              <aside className={styles.stack} aria-label="Wedding details">
                <section className={styles.panel} aria-labelledby="members-heading">
                  <div className={styles.panelHeading}><div><h2 id="members-heading">Wedding members</h2><p>The people planning alongside you.</p></div><Link href="/dashboard/members" className={styles.textLink}>View all <span aria-hidden="true">→</span></Link></div>
                  {isAdmin && <div className={styles.invitationNotice}><span aria-hidden="true">✉</span><div><strong>{invitations.length} pending {invitations.length === 1 ? "invitation" : "invitations"}</strong><p>Manage invitations in your wedding members page.</p></div></div>}
                  <ul className={styles.memberList}>{members.slice(0, 3).map((member) => <li key={member.membershipId}><span className={styles.avatar} aria-hidden="true">{member.user.name.trim().charAt(0).toUpperCase() || "?"}</span><div className={styles.memberName}><strong>{member.user.name}{member.user.id === user.id ? " (You)" : ""}</strong><span>{memberRoleLabel(member.role)}</span></div></li>)}</ul>
                  {members.length === 0 && <p className={styles.muted}>No members to display.</p>}
                </section>
                <section className={styles.panel} aria-labelledby="guests-heading"><div className={styles.panelHeading}><div><h2 id="guests-heading">Guest list</h2><p>Keep your invitations organized.</p></div><Link href="/dashboard/guests" className={styles.textLink}>View guests →</Link></div><p className={styles.placeholderText}>{guests?.summary.total ?? 0} guest parties · {guests?.summary.capacity ?? 0} maximum attendees · {guests?.summary.confirmedAttendees ?? 0} confirmed attendees.</p></section>
                <section className={styles.panel} aria-labelledby="expenses-heading"><div className={styles.panelHeading}><div><h2 id="expenses-heading">Recorded expenses</h2><p>A clearer view of your wedding finances.</p></div><Link href="/dashboard/expenses" className={styles.textLink}>View expenses →</Link></div><p className={styles.placeholderText}>{expenses?.count ?? 0} expense records.</p></section>
              </aside>
            </div>
          </>
        ) : (
          <section className={`${styles.panel} ${styles.coordinator}`} aria-labelledby="assigned-heading"><div className={styles.panelHeading}><div><h2 id="assigned-heading">Your assigned events</h2><p>A space for the celebrations you help coordinate.</p></div><Link href="/dashboard/events" className={styles.textLink}>View events →</Link></div>{events.length ? <ul className={styles.memberList}>{events.slice(0, 3).map((event) => <li key={event.id}><div className={styles.memberName}><strong>{event.name}</strong><span>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: wedding.timeZone }).format(new Date(event.startsAt))} ({wedding.timeZone})</span></div></li>)}</ul> : <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">✦</span><div><h3>No assigned events yet</h3><p>An admin or manager can assign you to an event.</p></div></div>}</section>
        )}
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <Link href="/dashboard" aria-label="Our Big Day dashboard" className={styles.footerLogo}>
                <span className={brandStyles.brandLogo}>
                  <span className={brandStyles.brandMark} aria-hidden="true"><span className={brandStyles.brandMonogramO}>O</span><span className={brandStyles.brandMonogramDivider} /><span className={brandStyles.brandMonogramB}>B</span></span>
                  <span className={brandStyles.brandName}>Our <em>Big Day</em></span>
                </span>
              </Link>
              <p>Thoughtfully planning the moments that matter.</p>
            </div>
            <nav className={styles.footerNav} aria-label="Footer navigation">
              <span>YOUR WEDDING SPACE</span>
              <div><Link href="/dashboard">Dashboard</Link><Link href="/dashboard/events">Wedding events</Link><Link href="/dashboard/tasks">Tasks</Link>{canViewMembers && <><Link href="/dashboard/guests">Guests</Link><Link href="/dashboard/expenses">Expenses</Link><Link href="/dashboard/members">Wedding members</Link></>}</div>
            </nav>
          </div>
          <div className={styles.footerBottom}><p>Our Big Day <span aria-hidden="true">·</span> Made for celebrating together</p><p>Plan beautifully, together.</p></div>
        </div>
      </footer>
    </DashboardShell>
  );
}
