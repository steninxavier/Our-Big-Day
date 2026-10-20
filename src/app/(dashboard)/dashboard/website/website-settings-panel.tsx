"use client";

import { useState, type FormEvent } from "react";

import { websiteSettingsSchema, websiteThemes, type WebsiteSettingsInput } from "@/modules/weddings/website.schemas";

import styles from "./website.module.css";

const themeDetails = {
  CLASSIC_INDIAN: { name: "Classic Indian", note: "Ceremonial warmth with timeless detail." },
  MINIMAL_ELEGANT: { name: "Minimal Elegant", note: "Quiet editorial typography and calm space." },
  MODERN_CELEBRATION: { name: "Modern Celebration", note: "A brighter, contemporary announcement." },
} as const;

type Settings = WebsiteSettingsInput & { slug: string };

class RequestError extends Error { constructor(message: string) { super(message); } }
async function responseJson(response: Response) { const json = await response.json(); if (!response.ok) throw new RequestError(json.error?.message || "Something went wrong. Please try again."); return json; }

export default function WebsiteSettingsPanel({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const publicPath = `/w/${settings.slug}`;

  async function copyLink() {
    try { await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`); setMessage("Public link copied."); }
    catch { setMessage("Copy this link from the address shown below."); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const parsed = websiteSettingsSchema.safeParse({ theme: form.get("theme"), isPublished: form.get("isPublished") === "on", welcomeMessage: form.get("welcomeMessage") });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Please review the website settings."); return; }
    setSaving(true);
    try { const result = await responseJson(await fetch("/api/wedding/website", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) })); setSettings(result.data); setMessage(result.data.isPublished ? "Your wedding website is published." : "Your wedding website is now private."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save website settings."); }
    finally { setSaving(false); }
  }

  return <div className={styles.page}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>Wedding experience</p><h1>Wedding website</h1><p>Create a graceful, shareable home for your celebration.</p></div><a className={styles.preview} href={publicPath} target="_blank" rel="noreferrer">Preview website <span aria-hidden="true">↗</span></a></header>
    <section className={styles.addressCard} aria-labelledby="website-address"><div><span className={styles.cardLabel}>Your wedding address</span><strong id="website-address">{publicPath}</strong><p>Stable and ready to share whenever you publish.</p></div><button type="button" className={styles.secondary} onClick={() => void copyLink()}>Copy link</button></section>
    <form className={styles.form} onSubmit={save}>
      <section className={styles.section} aria-labelledby="appearance-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Appearance</p><h2 id="appearance-heading">Choose a theme</h2><p>Each theme presents the same wedding details with a distinct tone.</p></div></div><fieldset className={styles.themeChoices}><legend className={styles.srOnly}>Website theme</legend>{websiteThemes.map((theme) => <label key={theme} className={`${styles.themeCard} ${settings.theme === theme ? styles.selectedTheme : ""}`}><input type="radio" name="theme" value={theme} checked={settings.theme === theme} onChange={() => setSettings((current) => ({ ...current, theme }))} /><span className={`${styles.themePreview} ${styles[theme]}`} aria-hidden="true"><i /><b>{themeDetails[theme].name}</b><em /></span><span><strong>{themeDetails[theme].name}</strong><small>{themeDetails[theme].note}</small></span></label>)}</fieldset></section>
      <section className={styles.section} aria-labelledby="message-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Welcome</p><h2 id="message-heading">A note for your guests</h2><p>Shown near the beginning of your public wedding website.</p></div></div><label className={styles.messageLabel}>Welcome message<textarea name="welcomeMessage" maxLength={2000} rows={5} value={settings.welcomeMessage} onChange={(event) => setSettings((current) => ({ ...current, welcomeMessage: event.target.value }))} placeholder="We would be delighted to celebrate with you." /></label></section>
      <section className={styles.section} aria-labelledby="visibility-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Visibility</p><h2 id="visibility-heading">Publish your website</h2><p>Only published websites can be viewed through the public link.</p></div></div><label className={styles.publishControl}><input type="checkbox" name="isPublished" checked={settings.isPublished} onChange={(event) => setSettings((current) => ({ ...current, isPublished: event.target.checked }))} /><span><strong>{settings.isPublished ? "Published" : "Private"}</strong><small>{settings.isPublished ? "Your link is available to everyone you share it with." : "Visitors see nothing until you choose to publish."}</small></span></label></section>
      {error && <p className={styles.error} role="alert">{error}</p>}{message && <p className={styles.success} role="status">{message}</p>}
      <div className={styles.actions}><button type="submit" className={styles.primary} disabled={saving}>{saving ? "Saving…" : "Save website settings"}</button></div>
    </form>
  </div>;
}
