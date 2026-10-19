"use client";

import { useState } from "react";
import styles from "./guests.module.css";

type Props = {
  guestId: string;
  name: string;
  email: string;
  rsvpStatus: string;
  invitationSentAt: string | null;
  onSent: () => void;
};

export default function GuestEmailActions({ guestId, name, email, rsvpStatus, invitationSentAt, onSent }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function send(kind: "invitation" | "reminder") {
    if (!email || busy) return;
    const action = kind === "reminder" ? "Send an RSVP reminder" : invitationSentAt ? "Resend the invitation" : "Send the invitation";
    if (!window.confirm(`${action} to ${name} at ${email}?`)) return;
    setMessage(""); setFailed(false); setBusy(true);
    try {
      let response: Response;
      try {
        response = await fetch(`/api/guests/${guestId}/send-${kind}`, { method: "POST" });
      } catch {
        throw new Error("The email outcome is unknown because the connection was interrupted. Check with the guest before retrying.");
      }
      let data;
      try { data = await response.json(); } catch {
        throw new Error("The email outcome is unknown because the response could not be read. Check with the guest before retrying.");
      }
      if (!response.ok) throw new Error(data.error?.message ?? "Could not send the email.");
      setMessage("Accepted by the email provider. Delivery is not confirmed.");
      onSent();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Could not send the email.");
    } finally { setBusy(false); }
  }
  if (!email) return <span className={styles.actionHint}>Add an email to send an invitation.</span>;
  return <div className={styles.emailActions}>
    <div className={styles.emailButtons}>
      <button type="button" className={`${styles.rowButton} ${styles.rowButtonPrimary}`} disabled={busy} onClick={() => send("invitation")} aria-label={`${invitationSentAt ? "Resend" : "Email"} invitation for ${name}`}>{busy ? "Sending…" : invitationSentAt ? "Resend email" : "Email invite"}</button>
      {rsvpStatus === "PENDING" && <button type="button" className={styles.rowButton} disabled={busy} onClick={() => send("reminder")} aria-label={`Send RSVP reminder for ${name}`}>Remind</button>}
    </div>
    {message && <p role={failed ? "alert" : "status"} className={`${failed ? styles.error : styles.small} ${styles.actionFeedback}`}>{message}</p>}
  </div>;
}
