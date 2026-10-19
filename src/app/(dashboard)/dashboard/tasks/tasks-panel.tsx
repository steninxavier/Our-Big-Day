"use client";

import { useEffect, useState } from "react";
import type { listTasks } from "@/modules/tasks/task.service";
import { taskSchema } from "@/modules/tasks/schemas";
import buttonStyles from "@/shared/ui/action-button.module.css";
import styles from "./tasks.module.css";

type Result = Awaited<ReturnType<typeof listTasks>>;
type Task = Result["data"][number];
type Option = { id: string; name: string };
type Draft = { title: string; description: string; eventId: string; assignedMembershipId: string; dueDate: string; priority: "LOW" | "MEDIUM" | "HIGH"; status: "TODO" | "IN_PROGRESS" | "COMPLETED" };
const emptyDraft: Draft = { title: "", description: "", eventId: "", assignedMembershipId: "", dueDate: "", priority: "MEDIUM", status: "TODO" };
const labelStatus: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", COMPLETED: "Completed" };

function dateInZone(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function midnightInZone(date: string, timeZone: string) {
  const desired = Date.parse(`${date}T00:00:00Z`);
  let guess = desired;
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(guess));
    const n = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const represented = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
    guess += desired - represented;
  }
  return new Date(guess).toISOString();
}
function draftFrom(task: Task, timeZone: string): Draft {
  return { title: task.title, description: task.description, eventId: task.eventId ?? "", assignedMembershipId: task.assignedMembershipId ?? "", dueDate: task.dueDate ? dateInZone(task.dueDate, timeZone) : "", priority: task.priority as Draft["priority"], status: task.status as Draft["status"] };
}
export default function TasksPanel({ initial, events, members, canManage, timeZone }: { initial: Result; events: Option[]; members: Option[]; canManage: boolean; timeZone: string }) {
  const [result, setResult] = useState(initial);
  const [view, setView] = useState("all");
  const [status, setStatus] = useState("");
  const [event, setEvent] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    if (view === "mine") query.set("mine", "true");
    if (view === "completed") query.set("status", "COMPLETED");
    else if (status) query.set("status", status);
    if (event) query.set("eventId", event);
    if (assignee) query.set("assignedMembershipId", assignee);
    if (priority) query.set("priority", priority);
    if (search.trim()) query.set("q", search.trim());
    fetch(`/api/tasks?${query}`, { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error("Could not load tasks. Please try again."); return response.json() as Promise<Result>; }).then((data) => { if (controller.signal.aborted) return; const lastPage = Math.max(1, data.pagination.totalPages); if (page > lastPage) { setPage(lastPage); return; } setResult(data); }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load tasks."); });
    return () => controller.abort();
  }, [view, status, event, assignee, priority, search, page, reload]);
  function start(task?: Task) { setError(""); setDraft(task ? draftFrom(task, timeZone) : emptyDraft); setEditing(task ?? "new"); }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const payload = { ...draft, eventId: draft.eventId || null, assignedMembershipId: draft.assignedMembershipId || null, dueDate: draft.dueDate ? (editing !== "new" && editing?.dueDate && dateInZone(editing.dueDate, timeZone) === draft.dueDate ? editing.dueDate : midnightInZone(draft.dueDate, timeZone)) : null };
    const checked = taskSchema.safeParse(payload);
    if (!checked.success) { setError(checked.error.issues[0]?.message ?? "Please check your details."); return; }
    setSaving(true);
    try {
      const response = await fetch(editing === "new" ? "/api/tasks" : `/api/tasks/${(editing as Task).id}`, { method: editing === "new" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing === "new" ? checked.data : { ...checked.data, expectedRevision: (editing as Task).revision }) });
      if (!response.ok) { const data = await response.json(); if (response.status === 409) setReload((n) => n + 1); throw new Error(data.error?.message ?? "Could not save the task."); }
      setEditing(null); setPage(1); setReload((n) => n + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the task."); } finally { setSaving(false); }
  }
  async function remove(task: Task) {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    setError(""); setSaving(true);
    try { const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" }); if (!response.ok) { const data = await response.json(); throw new Error(data.error?.message ?? "Could not delete the task."); } setPage(1); setReload((n) => n + 1); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete the task."); } finally { setSaving(false); }
  }
  function resetPage(action: () => void) { setPage(1); action(); }
  return <div className={styles.layout}>
    <div className={styles.heading}><div><p className={styles.eyebrow}>Your wedding space / Tasks</p><h1>Wedding preparation tasks</h1><p>Bring your plans together and keep track of the details that matter.</p></div>{canManage ? <button type="button" className={buttonStyles.button} onClick={() => start()}>+ Add task</button> : <span className={styles.readOnly}>View-only access</span>}</div>
    {!canManage && <div className={styles.notice}><strong>Your assigned celebrations</strong><p>You can view tasks for events assigned to you. Only admins and managers can make changes.</p></div>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {editing && <section className={styles.formPanel} aria-labelledby="task-form-title"><div className={styles.formHeading}><div><p className={styles.eyebrow}>Preparation details</p><h2 id="task-form-title">{editing === "new" ? "Add a task" : "Edit task"}</h2></div><button type="button" className={styles.link} onClick={() => setEditing(null)}>Close</button></div>
      <form onSubmit={save} className={styles.form}>
        <label>Task title <span aria-hidden="true">*</span><input required maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Confirm the venue walkthrough" /></label>
        <label>Description<textarea maxLength={2000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} /></label>
        <div className={styles.formGrid}><label>Related event<select value={draft.eventId} onChange={(e) => setDraft({ ...draft, eventId: e.target.value })}><option value="">General wedding task</option>{editing !== "new" && editing.eventId && !events.some((item) => item.id === editing.eventId) && <option value={editing.eventId}>{editing.event?.name ?? "Previous event"} (archived)</option>}{events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Assigned member<select value={draft.assignedMembershipId} onChange={(e) => setDraft({ ...draft, assignedMembershipId: e.target.value })}><option value="">Unassigned</option>{editing !== "new" && editing.assignedMembershipId && !members.some((item) => item.id === editing.assignedMembershipId) && <option value={editing.assignedMembershipId}>Former member</option>}{members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Due date <small>({timeZone})</small><input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></label>
        <label>Priority<select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Draft["priority"] })}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
        <label>Status<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft["status"] })}><option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option></select></label></div>
        <div className={styles.actions}><button type="submit" className={buttonStyles.button} disabled={saving}>{saving ? "Saving…" : "Save task"}</button><button type="button" className={styles.secondary} onClick={() => setEditing(null)}>Cancel</button></div>
      </form></section>}
    <section aria-label="Task list"><div className={styles.toolbar}><div className={styles.tabs} role="group" aria-label="Task views">{[["all", "All tasks"], ["mine", "My tasks"], ["completed", "Completed"]].map(([value, name]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => resetPage(() => setView(value))}>{name}</button>)}</div><span className={styles.count}>{result.pagination.total} {result.pagination.total === 1 ? "task" : "tasks"}</span></div>
    <div className={styles.filters}>
      <label>Search<input type="search" maxLength={100} value={search} placeholder="Search tasks" onChange={(e) => resetPage(() => setSearch(e.target.value))} /></label>
      <label>Status<select value={view === "completed" ? "COMPLETED" : status} disabled={view === "completed"} onChange={(e) => resetPage(() => setStatus(e.target.value))}><option value="">All statuses</option><option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option></select></label>
      <label>Event<select value={event} onChange={(e) => resetPage(() => setEvent(e.target.value))}><option value="">All events</option>{canManage && <option value="none">General task</option>}{events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {canManage && <label>Assigned member<select value={assignee} onChange={(e) => resetPage(() => setAssignee(e.target.value))}><option value="">All members</option><option value="none">Unassigned</option>{members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <label>Priority<select value={priority} onChange={(e) => resetPage(() => setPriority(e.target.value))}><option value="">All priorities</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
      <button type="button" className={styles.link} onClick={() => { setView("all"); setStatus(""); setEvent(""); setAssignee(""); setPriority(""); setSearch(""); setPage(1); }}>Reset filters</button>
    </div>
    <div className={styles.list}>{result.data.length === 0 ? <div className={styles.empty}><span aria-hidden="true">✓</span><h2>No tasks to show</h2><p>{canManage ? "Add a task or adjust your filters to see your plans here." : "Tasks for your assigned events will appear here."}</p>{canManage && <button type="button" className={buttonStyles.button} onClick={() => start()}>+ Add task</button>}</div> : <ul>{result.data.map((task) => <li key={task.id} className={styles.row}><div className={styles.title}><strong>{task.title}</strong><span>{task.event?.name ?? (task.eventId ? "Previous event" : "General wedding task")}{task.event?.archivedAt ? " · Archived" : ""}</span>{task.description && <p>{task.description}</p>}</div><div><small>Assigned to</small><span>{task.assignee?.name ?? (task.assignedMembershipId ? "Former member" : "Unassigned")}</span></div><div><small>Due date</small><span>{task.dueDate ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone }).format(new Date(task.dueDate)) : "No due date"}</span></div><div><small>Priority</small><span className={`${styles.pill} ${task.priority === "HIGH" ? styles.high : ""}`}>{task.priority.toLowerCase()}</span></div><div><small>Status</small><span className={styles.pill}>{labelStatus[task.status]}</span></div>{canManage && <div className={styles.rowActions}><button type="button" className={styles.link} onClick={() => start(task)}>Edit</button><button type="button" className={styles.link} disabled={saving} onClick={() => remove(task)}>Delete</button></div>}</li>)}</ul>}</div>
    {result.pagination.totalPages > 1 && <div className={styles.pagination}><button className={styles.secondary} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {result.pagination.totalPages}</span><button className={styles.secondary} disabled={page >= result.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </section>
  </div>;
}
