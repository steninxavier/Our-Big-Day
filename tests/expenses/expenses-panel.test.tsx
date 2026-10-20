import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExpensesPanel from "@/app/(dashboard)/dashboard/expenses/expenses-panel";

const expense = { id: "111111111111111111111111", title: "Venue", amountPaise: 10000, currency: "INR" as const, expenseDate: "2026-10-20", category: "VENUE" as const, eventId: "222222222222222222222222", notes: "", revision: 0 };
const newer = { ...expense, title: "Updated venue", amountPaise: 20000, revision: 1 };
const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 };
const summary = { totalExpensePaise: 10000, currency: "INR", count: 1, byCategory: [] };
const events = [{ id: expense.eventId, name: "Old ceremony", archived: true }, { id: "333333333333333333333333", name: "Reception", archived: false }, { id: "444444444444444444444444", name: "Another ceremony", archived: true }];
function result(data: unknown, ok = true) { return { ok, json: async () => data }; }
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
describe("expense conflict recovery and event history", () => {
  it("preserves the draft on conflict and reopens the latest revision", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<ReturnType<typeof result>>>().mockResolvedValueOnce(result({ data: expense })).mockResolvedValueOnce(result({ error: { code: "CONFLICT", message: "Changed" } }, false)).mockResolvedValueOnce(result({ data: [newer], pagination })).mockResolvedValueOnce(result({ data: summary })).mockResolvedValueOnce(result({ data: newer })).mockResolvedValueOnce(result({ data: newer })).mockResolvedValueOnce(result({ data: [newer], pagination })).mockResolvedValueOnce(result({ data: summary }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ExpensesPanel initial={{ data: [expense], pagination }} initialSummary={summary} events={events} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Venue" }));
    const title = within(await screen.findByRole("dialog")).getByLabelText("Expense name");
    fireEvent.change(title, { target: { value: "My unsaved edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your draft is still here");
    expect(title).toHaveValue("My unsaved edit");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Updated venue" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeVisible());
    expect(within(screen.getByRole("dialog")).getByLabelText("Expense name")).toHaveValue("Updated venue");
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8));
    expect(JSON.parse(String(fetchMock.mock.calls[5][1]?.body))).toMatchObject({ expectedRevision: 1 });
  });
  it("shows archived event names in the table and filter, but prevents new archived links", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(result({ data: expense })));
    render(<ExpensesPanel initial={{ data: [expense], pagination }} initialSummary={summary} events={events} />);
    expect(screen.getByRole("cell", { name: "Old ceremony (Archived)" })).toBeInTheDocument();
    expect(within(screen.getByLabelText("Event")).getByRole("option", { name: "Another ceremony (Archived)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Venue" }));
    const linked = within(await screen.findByRole("dialog")).getByLabelText("Linked event");
    expect(linked).toHaveValue(expense.eventId);
    expect(within(linked).getByRole("option", { name: "Old ceremony (Archived)" })).toBeInTheDocument();
    expect(within(linked).queryByRole("option", { name: "Another ceremony (Archived)" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add expense" }));
    expect(within(screen.getByLabelText("Linked event")).queryByRole("option", { name: "Old ceremony (Archived)" })).not.toBeInTheDocument();
  });
  it("retries the direct record read if conflict refresh fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(result({ data: expense })).mockResolvedValueOnce(result({ error: { code: "CONFLICT", message: "Changed" } }, false)).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(result({ data: newer }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ExpensesPanel initial={{ data: [expense], pagination }} initialSummary={summary} events={events} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Venue" }));
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("Expense name"), { target: { value: "My draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("list could not be refreshed");
    expect(screen.getByLabelText("Expense name")).toHaveValue("My draft");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Venue" }));
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByLabelText("Expense name")).toHaveValue("Updated venue"));
  });
  it("does not reopen a stale draft when the latest record cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<ExpensesPanel initial={{ data: [expense], pagination }} initialSummary={summary} events={events} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Venue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the latest expense");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
