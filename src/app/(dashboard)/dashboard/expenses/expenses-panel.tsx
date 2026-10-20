"use client";

import { useRef, useState, type FormEvent } from "react";
import { expenseCategories, expenseSchema, type ExpenseInput } from "@/modules/expenses/schemas";
import styles from "./expenses.module.css";

type Expense = ExpenseInput & { id: string; revision: number };
type Page = { data: Expense[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
type Summary = { totalExpensePaise: number; currency: string; count: number; byCategory: { category: string; amountPaise: number; count: number }[] };
type EventOption = { id: string; name: string; archived: boolean };
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
const label = (category: string) => category.charAt(0) + category.slice(1).toLowerCase();
const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
class RequestError extends Error { constructor(message: string, readonly code?: string) { super(message); } }
async function responseJson(response: Response) { const json = await response.json(); if (!response.ok) throw new RequestError(json.error?.message || "Something went wrong. Please try again.", json.error?.code); return json; }
function parseAmount(value: string) { if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) return NaN; const [rupees, paise = ""] = value.split("."); return Number(rupees) * 100 + Number(paise.padEnd(2, "0")); }

export default function ExpensesPanel({ initial, initialSummary, events }: { initial: Page; initialSummary: Summary; events: EventOption[] }) {
  const [page, setPage] = useState(initial);
  const [summary, setSummary] = useState(initialSummary);
  const [category, setCategory] = useState("");
  const [eventId, setEventId] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  async function load(target: number, refreshSummary = false) {
    const query = new URLSearchParams({ page: String(target), limit: "20" });
    if (category) query.set("category", category); if (eventId) query.set("eventId", eventId); if (search.trim()) query.set("search", search.trim()); if (from) query.set("from", from); if (to) query.set("to", to);
    const result: Page = await responseJson(await fetch(`/api/expenses?${query}`, { cache: "no-store" }));
    if (target > Math.max(1, result.pagination.totalPages)) return load(Math.max(1, result.pagination.totalPages), refreshSummary);
    setPage(result);
    if (refreshSummary) setSummary((await responseJson(await fetch("/api/expenses/summary", { cache: "no-store" }))).data);
  }
  async function refresh(target: number, refreshSummary = false) { setError(""); setBusy(true); try { await load(target, refreshSummary); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load expenses."); } finally { setBusy(false); } }
  async function openForm(expense: Expense | null) {
    setError("");
    if (expense) {
      setBusy(true);
      try {
        expense = (await responseJson(await fetch(`/api/expenses/${expense.id}`, { cache: "no-store" }))).data as Expense;
        const latest = expense;
        setPage((current) => ({ ...current, data: current.data.map((item) => item.id === latest.id ? latest : item) }));
      } catch (e) {
        setError(e instanceof RequestError && e.code === "NOT_FOUND" ? "This expense is no longer available. Refresh the list to see the latest records." : "Could not load the latest expense. Please try again.");
        setBusy(false); return;
      }
      setBusy(false);
    }
    setEditing(expense); setFormError(""); setFormKey((key) => key + 1); dialog.current?.showModal();
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError("");
    const form = new FormData(event.currentTarget);
    const parsed = expenseSchema.safeParse({ title: form.get("title"), amountPaise: parseAmount(String(form.get("amount") ?? "")), currency: "INR", expenseDate: form.get("expenseDate"), category: form.get("category"), eventId: form.get("eventId") || null, notes: form.get("notes") });
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message || "Please check the form."); return; }
    setBusy(true);
    try {
      await responseJson(await fetch(editing ? `/api/expenses/${editing.id}` : "/api/expenses", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { ...parsed.data, expectedRevision: editing.revision } : parsed.data) }));
      dialog.current?.close(); await load(editing ? page.pagination.page : 1, true);
    } catch (e) {
      if (e instanceof RequestError && e.code === "CONFLICT" && editing) {
        try { await load(page.pagination.page, true); setFormError("This expense changed. Your draft is still here; close the form and reopen the expense to review the latest version."); }
        catch { setFormError("This expense changed and the list could not be refreshed. Your draft is still here; close the form and try opening the expense again."); }
      } else { const message = e instanceof Error ? e.message : "Unable to save expense."; if (dialog.current?.open) setFormError(message); else setError(message); }
    } finally { setBusy(false); }
  }
  async function remove(expense: Expense) { if (!window.confirm(`Delete “${expense.title}”? This cannot be undone.`)) return; setBusy(true); setError(""); try { await responseJson(await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" })); await load(page.pagination.page, true); } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete expense."); } finally { setBusy(false); } }

  return <div className={styles.page}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>Wedding planning · Your private space</p><h1>Expenses</h1><p>Keep a thoughtful record of expenses for your celebrations.</p></div><button type="button" className={styles.primary} disabled={busy} onClick={() => void openForm(null)}>+ Add expense</button></header>
    <div className={styles.privacy}><span aria-hidden="true">◇</span><div><strong>Private to your planning team</strong><p>Expense records are visible only to wedding admins and managers.</p></div></div>
    <section className={styles.summary} aria-label="Expense summary"><div className={styles.totalCard}><span className={styles.cardLabel}>Total recorded expenses</span><strong>{money(summary.totalExpensePaise)}</strong><p>Money spent or committed across your wedding.</p></div><div className={styles.countCard}><span className={styles.cardLabel}>Expense records</span><strong>{summary.count}</strong><p>Thoughtfully kept in one place.</p></div><div className={styles.categoryCard}><span className={styles.cardLabel}>By category</span>{summary.byCategory.length ? <ul>{summary.byCategory.map((row) => <li key={row.category}><span>{label(row.category)}</span><strong>{money(row.amountPaise)}</strong></li>)}</ul> : <p>Your category totals will appear here.</p>}</div></section>
    <section className={styles.panel} aria-labelledby="expense-list-heading"><div className={styles.panelHeader}><div><h2 id="expense-list-heading">Expense records</h2><p>A clear view of your wedding expenses.</p></div><span>{page.pagination.total} {page.pagination.total === 1 ? "record" : "records"}</span></div>
      <form className={styles.filters} onSubmit={(e) => { e.preventDefault(); void refresh(1); }}><label>Search<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Expense name" /></label><label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{expenseCategories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><label>Event<select value={eventId} onChange={(e) => setEventId(e.target.value)}><option value="">All events</option>{events.map((item) => <option key={item.id} value={item.id}>{item.name}{item.archived ? " (Archived)" : ""}</option>)}</select></label><label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><button className={styles.secondary} disabled={busy}>Apply</button></form>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">Expense</th><th scope="col">Category</th><th scope="col">Event</th><th scope="col">Date</th><th scope="col" className={styles.amount}>Amount</th><th scope="col" className={styles.actions}>Actions</th></tr></thead><tbody>{page.data.map((expense) => { const linked = events.find((item) => item.id === expense.eventId); return <tr key={expense.id}><td data-label="Expense"><strong>{expense.title}</strong>{expense.notes && <span className={styles.notes}>{expense.notes}</span>}</td><td data-label="Category"><span className={styles.category}>{label(expense.category)}</span></td><td data-label="Event">{linked ? `${linked.name}${linked.archived ? " (Archived)" : ""}` : expense.eventId ? "Unavailable event" : "General wedding"}</td><td data-label="Date">{formatDate(expense.expenseDate)}</td><td data-label="Amount" className={styles.amount}><strong>{money(expense.amountPaise)}</strong></td><td data-label="Actions" className={styles.actions}><button type="button" aria-label={`Edit ${expense.title}`} onClick={() => void openForm(expense)} disabled={busy}>Edit</button><button type="button" aria-label={`Delete ${expense.title}`} onClick={() => void remove(expense)} disabled={busy}>Delete</button></td></tr>; })}</tbody></table></div>
      {!page.data.length && <div className={styles.empty}><strong>No expenses found</strong><p>Add an expense or adjust your filters to see your records here.</p></div>}
      <div className={styles.pagination}><span>Page {page.pagination.page} of {Math.max(1, page.pagination.totalPages)}</span><div><button type="button" onClick={() => void refresh(page.pagination.page - 1)} disabled={busy || page.pagination.page <= 1}>Previous</button><button type="button" onClick={() => void refresh(page.pagination.page + 1)} disabled={busy || page.pagination.page >= page.pagination.totalPages}>Next</button></div></div>
    </section>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="expense-form-heading"><form key={formKey} onSubmit={save} className={styles.form}><div className={styles.formHeading}><div><p className={styles.eyebrow}>Wedding expenses</p><h2 id="expense-form-heading">{editing ? "Edit expense" : "Add expense"}</h2><p>Record money already spent or committed.</p></div><button type="button" className={styles.close} onClick={() => dialog.current?.close()} aria-label="Close form">×</button></div>
      <label>Expense name <input name="title" required maxLength={120} defaultValue={editing?.title} placeholder="e.g. Ceremony venue" /></label><div className={styles.formGrid}><label>Category <select name="category" defaultValue={editing?.category ?? "VENUE"}>{expenseCategories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><label>Linked event <select name="eventId" defaultValue={editing?.eventId ?? ""}><option value="">General wedding</option>{editing?.eventId && !events.some((item) => item.id === editing.eventId) && <option value={editing.eventId}>Unavailable event</option>}{events.filter((item) => !item.archived || item.id === editing?.eventId).map((item) => <option key={item.id} value={item.id}>{item.name}{item.archived ? " (Archived)" : ""}</option>)}</select></label></div><div className={styles.formGrid}><label>Amount (₹) <input name="amount" required inputMode="decimal" placeholder="e.g. 2500.00" defaultValue={editing ? (editing.amountPaise / 100).toFixed(2) : ""} /></label><label>Expense date <input type="date" name="expenseDate" required defaultValue={editing?.expenseDate} /></label></div><label>Notes <textarea name="notes" maxLength={2000} rows={4} defaultValue={editing?.notes} placeholder="Add any helpful details" /></label>{formError && <p role="alert" className={styles.error}>{formError}</p>}<div className={styles.formActions}><button type="button" className={styles.secondary} onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" className={styles.primary} disabled={busy}>{busy ? "Saving…" : "Save expense"}</button></div></form></dialog>
  </div>;
}
