"use client";

import { useEffect, useRef, useState } from "react";
import type { listGuests } from "@/modules/guests/guest.service";
import { guestSchema } from "@/modules/guests/schemas";
import buttonStyles from "@/shared/ui/action-button.module.css";
import styles from "./guests.module.css";
import ShareInvitation from "./share-invitation";
import GuestEmailActions from "./guest-email-actions";

type Result = Awaited<ReturnType<typeof listGuests>>;
type Guest = Result["data"][number];
type Option = { id: string; name: string };
type Draft = { name: string; email: string; phone: string; maxGuests: string; invitedEventIds: string[]; notes: string };
const emptyDraft: Draft = { name: "", email: "", phone: "", maxGuests: "1", invitedEventIds: [], notes: "" };
const labels: Record<string, string> = { PENDING: "Pending", ATTENDING: "Attending", NOT_ATTENDING: "Not attending" };
const acceptanceDate = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));

export default function GuestsPanel({ initial, events }: { initial: Result; events: Option[] }) {
  const [result, setResult] = useState(initial);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [event, setEvent] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<Guest | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("rsvpStatus", status);
    if (event) params.set("eventId", event);
    fetch(`/api/guests?${params}`, { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error("Could not load guests. Please try again."); return response.json() as Promise<Result>; }).then((data) => { if (controller.signal.aborted) return; const last = Math.max(1, data.pagination.totalPages); if (page > last) { setPage(last); return; } setResult(data); }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load guests."); });
    return () => controller.abort();
  }, [page, search, status, event, reload]);
  useEffect(() => { if (editing && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, [editing]);
  function open(guest?: Guest) {
    setError("");
    setDraft(guest ? { name: guest.name, email: guest.email, phone: guest.phone, maxGuests: String(guest.maxGuests), invitedEventIds: guest.invitedEventIds, notes: guest.notes } : emptyDraft);
    setEditing(guest ?? "new");
  }
  function close() { dialogRef.current?.close(); setEditing(null); setError(""); }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const checked = guestSchema.safeParse({ ...draft, maxGuests: Number(draft.maxGuests) });
    if (!checked.success) { setError(checked.error.issues[0]?.message ?? "Please check the guest details."); return; }
    setSaving(true);
    try {
      const response = await fetch(editing === "new" ? "/api/guests" : `/api/guests/${(editing as Guest).id}`, { method: editing === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing === "new" ? checked.data : { ...checked.data, expectedRevision: (editing as Guest).revision }) });
      if (!response.ok) { const data = await response.json(); if (response.status === 409) setReload((n) => n + 1); throw new Error(data.error?.message ?? "Could not save the guest."); }
      close(); setPage(1); setReload((n) => n + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the guest."); } finally { setSaving(false); }
  }
  async function remove(guest: Guest) {
    if (!window.confirm(`Remove “${guest.name}” from the guest list? This cannot be undone.`)) return;
    setError(""); setSaving(true);
    try { const response = await fetch(`/api/guests/${guest.id}`, { method: "DELETE" }); if (!response.ok) { const data = await response.json(); throw new Error(data.error?.message ?? "Could not remove the guest."); } setReload((n) => n + 1); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not remove the guest."); } finally { setSaving(false); }
  }
  const summary = result.summary;
  const choices = [...events, ...(editing && editing !== "new" ? editing.invitedEvents.filter((item) => !events.some((event) => event.id === item.id)).map((item) => ({ id: item.id, name: `${item.name} (${item.archivedAt ? "archived" : "unavailable"})` })) : [])];
  return <div className={styles.layout}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>Your wedding space / Guests <span>Admin &amp; Manager access</span></p><h1>Guest management</h1><p>Organize your guest list and the events you would like each party to attend.</p></div><button type="button" className={buttonStyles.button} onClick={() => open()}>+ Add guest party</button></header>
    <section aria-label="Guest overview" className={styles.metrics}>
      <article><span>Guest parties</span><strong>{summary.total}</strong><p>{summary.capacity} maximum attendees</p></article>
      <article><span>Attending</span><strong>{summary.attending}</strong><p>{summary.confirmedAttendees} confirmed attendees</p></article>
      <article><span>Pending responses</span><strong>{summary.pending}</strong><p>Parties awaiting a response</p></article>
      <article><span>Not attending</span><strong>{summary.notAttending}</strong><p>Parties unable to attend</p></article>
    </section>
    <p className={styles.notice}><strong>Planning by party.</strong> Each guest record represents one invitation, which may cover several attendees. Share its private link so the party can respond; saving a guest does not send an email.</p>
    {!editing && error && <p role="alert" className={styles.error}>{error}</p>}
    <section className={styles.list} aria-label="Guest list"><div className={styles.listHeading}><div><h2>Guest list</h2><p>{result.pagination.total} {result.pagination.total === 1 ? "party" : "parties"} found</p></div></div>
      <div className={styles.filters}><label>Search<input type="search" value={search} maxLength={120} placeholder="Search name, email or phone" onChange={(e) => { setPage(1); setSearch(e.target.value); }} /></label><label>RSVP status<select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="ATTENDING">Attending</option><option value="NOT_ATTENDING">Not attending</option></select></label><label>Event<select value={event} onChange={(e) => { setPage(1); setEvent(e.target.value); }}><option value="">All events</option>{events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className={styles.textButton} type="button" onClick={() => { setSearch(""); setStatus(""); setEvent(""); setPage(1); }}>Reset filters</button></div>
      {result.data.length === 0 ? <div className={styles.empty}><h3>No guests to show</h3><p>Add your first guest party or adjust your filters.</p><button type="button" className={buttonStyles.button} onClick={() => open()}>+ Add guest party</button></div> : <ul className={styles.rows}>{result.data.map((guest) => <li key={guest.id} className={styles.row}><div className={styles.guestName}><strong>{guest.name}</strong><span>{guest.email || guest.phone || "No contact details"}</span>{guest.email && guest.phone && <span>{guest.phone}</span>}<span>{guest.invitationSentAt ? `Email accepted ${acceptanceDate(guest.invitationSentAt)}` : "No email acceptance recorded"}</span>{guest.lastReminderSentAt && <span>Last reminder accepted {acceptanceDate(guest.lastReminderSentAt)}</span>}</div><div><small>Invited events</small><span>{guest.invitedEvents.length ? guest.invitedEvents.map((item) => `${item.name}${item.archivedAt ? " (archived)" : ""}`).join(", ") : "No events selected"}</span></div><div><small>Maximum attendees</small><span>{guest.maxGuests}</span></div><div><small>RSVP</small><span className={`${styles.badge} ${guest.rsvpStatus === "ATTENDING" ? styles.attending : guest.rsvpStatus === "NOT_ATTENDING" ? styles.declined : ""}`}>{labels[guest.rsvpStatus] ?? guest.rsvpStatus}{guest.numberAttending != null ? ` (${guest.numberAttending})` : ""}</span></div><div className={styles.rowActions}><ShareInvitation guestId={guest.id} name={guest.name} /><GuestEmailActions guestId={guest.id} name={guest.name} email={guest.email} rsvpStatus={guest.rsvpStatus} invitationSentAt={guest.invitationSentAt} onSent={() => setReload((n) => n + 1)} /><button type="button" className={styles.rowButton} onClick={() => open(guest)}>Edit<span className={styles.srOnly}> {guest.name}</span></button><button type="button" className={`${styles.rowButton} ${styles.rowButtonDanger}`} disabled={saving} onClick={() => remove(guest)}>Delete<span className={styles.srOnly}> {guest.name}</span></button></div></li>)}</ul>}
      <div className={styles.pagination}><span>Page {page} of {Math.max(1, result.pagination.totalPages)}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous</button><button type="button" disabled={page >= result.pagination.totalPages} onClick={() => setPage((n) => n + 1)}>Next</button></div></div>
    </section>
    {editing && <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="guest-form-title" onCancel={(e) => { e.preventDefault(); if (!saving) close(); }}><div className={styles.drawer}><header className={styles.drawerHeading}><div><p className={styles.eyebrow}>Guest party details</p><h2 id="guest-form-title">{editing === "new" ? "Add guest party" : "Edit guest party"}</h2><p>Choose the events and maximum attendance for this party.</p></div><button type="button" className={styles.textButton} disabled={saving} onClick={close} aria-label="Close guest form">✕</button></header>
      <form onSubmit={save} className={styles.form}><label>Guest or primary contact name <span>*</span><input autoFocus required maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Suresh Kumar & family" /></label><div className={styles.formGrid}><label>Email address <small>Optional</small><input type="email" maxLength={254} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label><label>Phone number <small>Optional</small><input type="tel" maxLength={40} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label></div><label>Maximum attendees allowed <span>*</span><input type="number" required min={1} max={10000} step={1} value={draft.maxGuests} onChange={(e) => setDraft({ ...draft, maxGuests: e.target.value })} /><small>Includes the named guest.</small></label><fieldset><legend>Invited wedding events</legend>{choices.length === 0 ? <p>No events yet. You can add them later.</p> : choices.map((item) => <label className={styles.eventChoice} key={item.id}><input type="checkbox" checked={draft.invitedEventIds.includes(item.id)} onChange={(e) => setDraft({ ...draft, invitedEventIds: e.target.checked ? [...draft.invitedEventIds, item.id] : draft.invitedEventIds.filter((id) => id !== item.id) })} />{item.name}</label>)}</fieldset><label>Notes <small>Optional</small><textarea rows={3} maxLength={2000} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label><p className={styles.notice}>Save the guest first, then share their private invitation link from the guest list. No invitation is sent automatically.</p>{error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.formActions}><button type="button" className={styles.secondary} disabled={saving} onClick={close}>Cancel</button><button type="submit" className={buttonStyles.button} disabled={saving}>{saving ? "Saving…" : "Save guest party"}</button></div></form></div></dialog>}
  </div>;
}
