"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./guests.module.css";

export default function ShareInvitation({ guestId, name }: { guestId: string; name: string }) {
  const [link, setLink] = useState<{ url: string; localOnly: boolean } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (link && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [link]);
  async function prepare() {
    setError(""); setBusy(true);
    try { const response = await fetch(`/api/guests/${guestId}/invitation-link`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "Could not prepare the invitation."); setLink(data.data); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not prepare the invitation."); } finally { setBusy(false); }
  }
  async function copy() { if (!link) return; try { await navigator.clipboard.writeText(link.url); setCopied(true); } catch { setError("Copy was blocked. Select the link and copy it manually."); } }
  async function share() { if (!link || !navigator.share) return; try { await navigator.share({ title: "Your wedding invitation", text: "You are invited! View your invitation and RSVP:", url: link.url }); } catch (reason) { if (!(reason instanceof Error && reason.name === "AbortError")) setError("Sharing was not available. Copy the link instead."); } }
  function close() { dialog.current?.close(); setLink(null); setError(""); setCopied(false); }
  return <>
    <button className={styles.rowButton} type="button" disabled={busy} aria-label={`Share invitation for ${name}`} onClick={prepare}>{busy ? "Preparing…" : "Share"}</button>
    {!link && error && <span role="alert" className={`${styles.error} ${styles.actionFeedback}`}>{error}</span>}
    {link && <dialog ref={dialog} className={styles.shareDialog} aria-labelledby={`share-${guestId}`} onCancel={(event) => { event.preventDefault(); close(); }}><div className={styles.shareContent}><div className={styles.drawerHeading}><div><p className={styles.eyebrow}>Private invitation</p><h2 id={`share-${guestId}`}>Share with {name}</h2></div><button type="button" className={styles.textButton} aria-label="Close sharing" onClick={close}>✕</button></div><p>Anyone with this link can view and change this party’s RSVP. Share it only with the intended guest.</p>{link.localOnly && <p className={styles.error} role="alert">This is a localhost link and will not work on another person’s device. Deploy the app and configure a public HTTPS application address before sharing.</p>}<label>Invitation link<input readOnly value={link.url} onFocus={(event) => event.currentTarget.select()} /></label><div className={styles.shareActions}><button type="button" className={styles.secondary} onClick={copy}>{copied ? "Copied" : "Copy link"}</button>{typeof navigator !== "undefined" && typeof navigator.share === "function" && <button type="button" className={styles.secondary} onClick={share}>Share…</button>}<a className={styles.secondary} href={`https://wa.me/?text=${encodeURIComponent(`You are invited! View your invitation and RSVP: ${link.url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></div>{error && <p role="alert" className={styles.error}>{error}</p>}<p className={styles.small}>Sharing or copying does not send an invitation automatically.</p></div></dialog>}
  </>;
}
