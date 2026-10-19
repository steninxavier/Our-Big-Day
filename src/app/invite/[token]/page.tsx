import Image from "next/image";
import { getInvitation } from "@/modules/guests/invitation.service";
import { AppError } from "@/shared/errors/app-error";
import RsvpForm from "./rsvp-form";
import styles from "./invitation.module.css";

export const metadata = { title: "Your wedding invitation", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invitation;
  try { invitation = await getInvitation(token); } catch (error) {
    if (!(error instanceof AppError) || error.code !== "NOT_FOUND") throw error;
    return <main className={styles.page}><div className={styles.card}><h1>Invitation unavailable</h1><p>This invitation is invalid or no longer available. Please contact the wedding organizer.</p></div></main>;
  }
  const { wedding, guest, events } = invitation;
  const format = (iso: string) => new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: wedding.timeZone }).format(new Date(iso));
  return <main className={styles.page}><div className={styles.wrapper}><header className={styles.hero}><span className={styles.brand}>OUR BIG DAY</span><p className={styles.eyebrow}>A celebration, together</p><h1>{wedding.brideName} <span>&amp;</span> {wedding.groomName}</h1><p>With joy, we invite you to celebrate with us.</p><div className={styles.rule} aria-hidden="true" /></header><Image className={styles.invitationImage} src="/guest-invitation-wedding.webp" alt="" width={1400} height={600} sizes="(max-width: 682px) calc(100vw - 32px), 650px" /><section className={styles.card}><p className={styles.eyebrow}>A special invitation for</p><h2>{guest.name}</h2><p>Your invitation is for up to {guest.maxGuests} {guest.maxGuests === 1 ? "person" : "people"}, including yourself.</p></section><section className={styles.card} aria-labelledby="celebrations"><p className={styles.eyebrow}>Gather with us</p><h2 id="celebrations">Your celebrations</h2>{events.length ? <ul className={styles.events}>{events.map((event, index) => <li key={`${event.name}-${event.startsAt}-${index}`}><span className={styles.eventDot} aria-hidden="true" /><div><h3>{event.name}</h3><p>{format(event.startsAt)} <small>({wedding.timeZone})</small></p>{event.venueName && <p>{event.venueName}</p>}{event.address && <p>{event.address}</p>}{event.dressCode && <p>Dress code: {event.dressCode}</p>}{event.description && <p>{event.description}</p>}</div></li>)}</ul> : <p>Event details will be shared by the wedding organizer.</p>}</section><RsvpForm token={token} initial={invitation.guest} /><footer className={styles.footer}>Thoughtfully celebrating together · Our Big Day</footer></div></main>;
}
