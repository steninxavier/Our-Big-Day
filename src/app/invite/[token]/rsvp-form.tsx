"use client";

import { useState } from "react";
import styles from "./invitation.module.css";

type Guest = { name: string; maxGuests: number; status: string; attendingCount: number | null };
export default function RsvpForm({ token, initial }: { token: string; initial: Guest }) {
  const [guest, setGuest] = useState(initial);
  const [status, setStatus] = useState(initial.status === "ATTENDING" || initial.status === "NOT_ATTENDING" ? initial.status : "");
  const [count, setCount] = useState(String(initial.attendingCount && initial.attendingCount > 0 ? initial.attendingCount : 1));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const attendingCount = status === "ATTENDING" ? Number(count) : 0;
    if (!status || (status === "ATTENDING" && (!Number.isInteger(attendingCount) || attendingCount < 1 || attendingCount > guest.maxGuests))) { setError(`Please choose a response and an attendance count between 1 and ${guest.maxGuests}.`); return; }
    setSaving(true);
    try {
      const response = await fetch(`/api/public/invitations/${token}/rsvp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, attendingCount }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 || data.error?.code === "PARTY_SIZE_CHANGED") { const latest = await fetch(`/api/public/invitations/${token}`, { cache: "no-store" }); if (latest.ok) { const refreshed = await latest.json(); setGuest(refreshed.data.guest); } }
        throw new Error(data.error?.message ?? "Could not save your response. Please try again.");
      }
      setGuest({ ...guest, status: data.data.status, attendingCount: data.data.attendingCount }); setMessage("Thank you. Your response has been saved. You can return to this link to change it.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save your response. Please try again."); } finally { setSaving(false); }
  }
  return <section className={styles.card} aria-labelledby="rsvp"><p className={styles.eyebrow}>Kindly respond</p><h2 id="rsvp">Will you join us?</h2><p>Current response: {guest.status === "ATTENDING" ? `Attending (${guest.attendingCount})` : guest.status === "NOT_ATTENDING" ? "Not attending" : "Awaiting your response"}.</p><form className={styles.form} onSubmit={submit}><fieldset><legend>Your response</legend><label className={styles.choice}><input type="radio" name="response" value="ATTENDING" checked={status === "ATTENDING"} onChange={() => setStatus("ATTENDING")} required /> Joyfully attending</label><label className={styles.choice}><input type="radio" name="response" value="NOT_ATTENDING" checked={status === "NOT_ATTENDING"} onChange={() => setStatus("NOT_ATTENDING")} required /> Unable to attend</label></fieldset>{status === "ATTENDING" && <label className={styles.count}>Number attending <input type="number" min={1} max={guest.maxGuests} step={1} required value={count} onChange={(event) => setCount(event.target.value)} /><small>Maximum {guest.maxGuests}, including you.</small></label>}{error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.success}>{message}</p>}<button type="submit" disabled={saving}>{saving ? "Saving…" : "Save response"}</button></form></section>;
}
