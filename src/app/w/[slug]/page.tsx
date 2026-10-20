import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicWeddingWebsite } from "@/modules/weddings/website.service";
import { AppError } from "@/shared/errors/app-error";

import styles from "./website.module.css";

type WeddingWebsitePageProps = { params: Promise<{ slug: string }> };

function formatDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone }).format(new Date(`${value}T00:00:00Z`));
}

function formatTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(value));
}

function formatEventTime(startsAt: string, endsAt: string | null, timeZone: string) {
  return endsAt ? `${formatTime(startsAt, timeZone)} - ${formatTime(endsAt, timeZone)}` : formatTime(startsAt, timeZone);
}

function eventMapUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function themeClass(theme: string) {
  return theme === "CLASSIC_INDIAN" ? styles.classic : theme === "MODERN_CELEBRATION" ? styles.modern : styles.minimal;
}

function youtubeEmbedUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || (url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : null);
    return id && /^[A-Za-z0-9_-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: WeddingWebsitePageProps): Promise<Metadata> {
  try {
    const website = await getPublicWeddingWebsite((await params).slug);
    return { title: website.title, description: website.welcomeMessage || `Celebrate ${website.title}` };
  } catch {
    return {};
  }
}

export default async function WeddingWebsitePage({ params }: WeddingWebsitePageProps) {
  let website: Awaited<ReturnType<typeof getPublicWeddingWebsite>>;
  try {
    website = await getPublicWeddingWebsite((await params).slug);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const livestreamUrl = youtubeEmbedUrl(website.livestream.youtubeUrl);
  return (
    <main className={`${styles.site} ${themeClass(website.theme)}`}>
      <header className={styles.nav}>
        <span className={styles.wordmark}>Our <em>Big Day</em></span>
        <a href="#celebration">Our celebration</a>
      </header>
      <section className={styles.hero}>
        <div className={styles.heroDetail} aria-hidden="true"><span /><i /><span /></div>
        <p className={styles.eyebrow}>Together with their families</p>
        <h1>{website.title}</h1>
        <p className={styles.date}>{formatDate(website.weddingDate, website.timeZone)}</p>
        {website.location && <p className={styles.location}>{website.location}</p>}
        <div className={styles.heroDetail} aria-hidden="true"><span /><i /><span /></div>
      </section>
      <section className={styles.welcome} aria-labelledby="welcome-heading">
        <p className={styles.eyebrow}>A warm welcome</p>
        <h2 id="welcome-heading">With joyful hearts, we invite you to celebrate with us.</h2>
        {website.welcomeMessage && <p>{website.welcomeMessage}</p>}
        {website.description && <p>{website.description}</p>}
      </section>
      <section className={styles.events} id="celebration" aria-labelledby="events-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Our celebration</p>
          <h2 id="events-heading">The moments we are looking forward to</h2>
          <p>We would be honoured to have you with us.</p>
        </div>
        {website.events.length > 0 ? (
          <ol className={styles.eventList}>
            {website.events.map((event) => (
              <li key={event.id} className={styles.event}>
                <time dateTime={event.startsAt}>
                  <span>{new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: website.timeZone }).format(new Date(event.startsAt)).toUpperCase()}</span>
                  <strong>{new Intl.DateTimeFormat("en-IN", { day: "2-digit", timeZone: website.timeZone }).format(new Date(event.startsAt))}</strong>
                </time>
                <div>
                  <h3>{event.name}</h3>
                  <p>{formatEventTime(event.startsAt, event.endsAt, website.timeZone)}</p>
                  {event.venueName && <p>{event.address ? `${event.venueName}, ${event.address}` : event.venueName}</p>}
                  {event.dressCode && <p className={styles.dressCode}>Dress code: {event.dressCode}</p>}
                </div>
                {event.address && <a className={styles.mapLink} href={eventMapUrl(event.address)} target="_blank" rel="noreferrer">View map <span aria-hidden="true">↗</span></a>}
              </li>
            ))}
          </ol>
        ) : <p className={styles.noEvents}>The celebration details will be shared here soon.</p>}
      </section>
      {livestreamUrl && (
        <section className={styles.livestream} aria-labelledby="livestream-heading">
          <div className={styles.sectionIntro}><p className={styles.eyebrow}>Join from afar</p><h2 id="livestream-heading">Watch our livestream</h2></div>
          <div className={styles.videoWrap}><iframe src={livestreamUrl} title={`${website.title} livestream`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
        </section>
      )}
      <section className={styles.closing}><p className={styles.eyebrow}>Save the date</p><h2>We cannot wait to celebrate with you.</h2><p>Invitation and RSVP details will be shared personally.</p></section>
      <footer className={styles.footer}><span>{website.title}</span><span>·</span><span>Our Big Day</span></footer>
    </main>
  );
}
