"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { eventSchema, eventTypes } from "@/modules/events/schemas";
import buttonStyles from "@/shared/ui/action-button.module.css";

type Event = { id: string; name: string; type: string; startsAt: string; endsAt: string | null; venueName: string; address: string; description: string; dressCode: string; coordinatorIds: string[] };
type Coordinator = { id: string; name: string };
type FormValues = { name: string; type: string; startsAt: string; endsAt: string; venueName: string; address: string; description: string; dressCode: string; coordinatorIds: string[] };
const blank: FormValues = { name: "", type: "CUSTOM", startsAt: "", endsAt: "", venueName: "", address: "", description: "", dressCode: "", coordinatorIds: [] };
const field = "mt-2 w-full rounded-lg border border-[#d9cfbd] bg-white px-3 py-3 text-sm text-[#17233a] outline-none focus-visible:ring-2 focus-visible:ring-[#b58a42]";
function localInput(value: string | null) { if (!value) return ""; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function showDate(value: string, timeZone: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value)) + ` (${timeZone})`; }

export default function EventsPanel({ events, coordinators, canManage, timeZone }: { events: Event[]; coordinators: Coordinator[]; canManage: boolean; timeZone: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function begin(event?: Event) { setEditing(event?.id ?? null); setValues(event ? { name: event.name, type: event.type, startsAt: localInput(event.startsAt), endsAt: localInput(event.endsAt), venueName: event.venueName, address: event.address, description: event.description, dressCode: event.dressCode, coordinatorIds: event.coordinatorIds } : blank); setError(""); setFormOpen(true); }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    if (!values.startsAt || Number.isNaN(new Date(values.startsAt).getTime()) || (values.endsAt && Number.isNaN(new Date(values.endsAt).getTime()))) { setError("Enter a valid start and end date and time."); return; }
    const parsed = eventSchema.safeParse({ ...values, startsAt: new Date(values.startsAt).toISOString(), endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the event details."); return; }
    setBusy(true);
    try { const response = await fetch(editing ? `/api/events/${editing}` : "/api/events", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }); const result = await response.json(); if (!response.ok) { setError(result.error?.message ?? "Unable to save the event."); return; } setFormOpen(false); router.refresh(); } catch { setError("Unable to save the event. Please try again."); } finally { setBusy(false); }
  }
  async function archive(event: Event) { if (!window.confirm(`Archive ${event.name}? It will no longer appear in planning views.`)) return; setError(""); setBusy(true); try { const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" }); if (!response.ok) { const result = await response.json(); setError(result.error?.message ?? "Unable to archive the event."); return; } router.refresh(); } catch { setError("Unable to archive the event. Please try again."); } finally { setBusy(false); } }
  return <div className="mt-10 space-y-6">
    {canManage && !formOpen && <button type="button" className={buttonStyles.button} onClick={() => begin()}>Create event</button>}
    {error && <p role="alert" className="rounded-lg bg-[#fff0ec] p-4 text-sm text-[#9e3f2e]">{error}</p>}
    {formOpen && <form onSubmit={submit} noValidate className="rounded-xl border border-[#17233a]/12 bg-[#fdfbf7] p-6 sm:p-8"><h2 className="font-[family-name:var(--font-playfair)] text-2xl text-[#17233a]">{editing ? "Edit event" : "Create an event"}</h2><p className="mt-2 text-sm text-[#75655b]">Dates and times use your device’s local time zone. Cover images will be available later.</p><div className="mt-6 grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold text-[#17233a]">Event name <span aria-hidden="true">*</span><input className={field} required maxLength={120} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} /></label>
      <label className="text-sm font-semibold text-[#17233a]">Event type<select className={field} value={values.type} onChange={(e) => setValues({ ...values, type: e.target.value })}>{eventTypes.map((type) => <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>)}</select></label>
      <label className="text-sm font-semibold text-[#17233a]">Starts <span aria-hidden="true">*</span><input className={field} type="datetime-local" required value={values.startsAt} onChange={(e) => setValues({ ...values, startsAt: e.target.value })} /></label>
      <label className="text-sm font-semibold text-[#17233a]">Ends<input className={field} type="datetime-local" value={values.endsAt} onChange={(e) => setValues({ ...values, endsAt: e.target.value })} /></label>
      <label className="text-sm font-semibold text-[#17233a]">Venue<input className={field} maxLength={200} value={values.venueName} onChange={(e) => setValues({ ...values, venueName: e.target.value })} /></label>
      <label className="text-sm font-semibold text-[#17233a]">Address<input className={field} maxLength={500} value={values.address} onChange={(e) => setValues({ ...values, address: e.target.value })} /></label>
      <label className="text-sm font-semibold text-[#17233a]">Dress code<input className={field} maxLength={200} value={values.dressCode} onChange={(e) => setValues({ ...values, dressCode: e.target.value })} /></label>
      <label className="text-sm font-semibold text-[#17233a] sm:col-span-2">Description<textarea className={field} rows={3} maxLength={2000} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} /></label>
    </div><fieldset className="mt-6"><legend className="text-sm font-semibold text-[#17233a]">Assigned event coordinators</legend><p className="mt-1 text-sm text-[#75655b]">Only selected coordinators can access this event.</p>{coordinators.length ? <div className="mt-3 flex flex-wrap gap-4">{coordinators.map((person) => <label key={person.id} className="flex items-center gap-2 text-sm text-[#17233a]"><input type="checkbox" checked={values.coordinatorIds.includes(person.id)} onChange={(e) => setValues({ ...values, coordinatorIds: e.target.checked ? [...values.coordinatorIds, person.id] : values.coordinatorIds.filter((id) => id !== person.id) })} />{person.name}</label>)}</div> : <p className="mt-2 text-sm text-[#75655b]">No event coordinators have joined this wedding yet.</p>}</fieldset><div className="mt-6 flex flex-wrap gap-3"><button className={buttonStyles.button} disabled={busy}>{busy ? "Saving…" : "Save event"}</button><button type="button" onClick={() => { setFormOpen(false); setError(""); }} className="cursor-pointer rounded-full border border-[#d9cfbd] px-5 py-2 text-sm font-semibold text-[#17233a] focus-visible:outline-2 focus-visible:outline-[#b58a42]">Cancel</button></div></form>}
    {events.length ? <ul className="grid gap-4">{events.map((event) => <li key={event.id} className="rounded-xl border border-[#17233a]/12 bg-[#fdfbf7] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9a783d]">{event.type.toLowerCase()}</p><h2 className="mt-2 font-[family-name:var(--font-playfair)] text-2xl text-[#17233a]">{event.name}</h2><p className="mt-2 text-sm text-[#75655b]">{showDate(event.startsAt, timeZone)}{event.endsAt && ` – ${showDate(event.endsAt, timeZone)}`}</p>{event.venueName && <p className="mt-2 text-sm text-[#75655b]">{event.venueName}{event.address && ` · ${event.address}`}</p>}{!event.venueName && event.address && <p className="mt-2 text-sm text-[#75655b]">{event.address}</p>}{event.dressCode && <p className="mt-2 text-sm text-[#75655b]">Dress code: {event.dressCode}</p>}{event.description && <p className="mt-3 whitespace-pre-wrap text-sm text-[#75655b]">{event.description}</p>}</div>{canManage && <div className="flex gap-3"><button type="button" onClick={() => begin(event)} className="cursor-pointer text-sm font-semibold text-[#17233a] underline underline-offset-4">Edit</button><button type="button" disabled={busy} onClick={() => archive(event)} className="cursor-pointer text-sm font-semibold text-[#805046] underline underline-offset-4">Archive</button></div>}</div></li>)}</ul> : <div className="rounded-xl border border-[#e6dec8] bg-[#fdfbf7] p-8 text-sm text-[#75655b]">{canManage ? "No events yet. Create your first celebration to get started." : "No events have been assigned to you yet."}</div>}
  </div>;
}
