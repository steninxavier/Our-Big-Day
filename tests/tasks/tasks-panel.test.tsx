import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TasksPanel from "@/app/(dashboard)/dashboard/tasks/tasks-panel";

const initial = { data: [{ id: "507f1f77bcf86cd799439011", title: "Confirm venue", description: "Call the venue", eventId: "507f1f77bcf86cd799439012", assignedMembershipId: null, dueDate: null, priority: "HIGH", status: "TODO", completedAt: null, revision: 3, createdAt: "2030-01-01T00:00:00Z", updatedAt: "2030-01-01T00:00:00Z", event: { id: "507f1f77bcf86cd799439012", name: "Wedding", archivedAt: null }, assignee: null }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
const events = [{ id: "507f1f77bcf86cd799439012", name: "Wedding" }];
afterEach(() => vi.restoreAllMocks());
describe("task management interface", () => {
  it("shows a coordinator only read-only controls and task details", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => initial } as Response);
    render(<TasksPanel initial={initial} events={events} members={[]} canManage={false} timeZone="UTC" />);
    expect(screen.getByText("View-only access")).toBeVisible();
    expect(screen.getByText("Confirm venue")).toBeVisible();
    expect(screen.queryByRole("button", { name: /add task|edit|delete/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Assigned member")).not.toBeInTheDocument();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  });
  it("submits a task with the wedding-local due date", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => ({ ok: true, json: async () => options?.method === "POST" ? { data: {} } : initial }) as Response);
    render(<TasksPanel initial={initial} events={events} members={[]} canManage timeZone="Asia/Kolkata" />);
    fireEvent.click(screen.getByRole("button", { name: /add task/i }));
    fireEvent.change(screen.getByLabelText(/task title/i), { target: { value: "Confirm caterer" } });
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: "2030-01-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Save task" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
    const call = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ title: "Confirm caterer", dueDate: "2030-01-01T18:30:00.000Z" });
  });
  it("sends the opened revision, preserves a rejected draft, and refreshes the list", async () => {
    const message = "This task changed. Close the form and reopen it to review the latest version.";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => options?.method === "PATCH" ? ({ ok: false, status: 409, json: async () => ({ error: { message } }) }) as Response : ({ ok: true, json: async () => initial }) as Response);
    render(<TasksPanel initial={initial} events={events} members={[]} canManage timeZone="UTC" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/task title/i), { target: { value: "My unsaved edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save task" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText(/task title/i)).toHaveValue("My unsaved edit");
    const patchCall = fetchMock.mock.calls.find(([, options]) => options?.method === "PATCH");
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({ title: "My unsaved edit", expectedRevision: 3 });
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, options]) => !options?.method).length).toBeGreaterThanOrEqual(2));
  });
  it("returns to the last existing page when another user removes the last page", async () => {
    const twoPages = { ...initial, pagination: { page: 1, limit: 20, total: 21, totalPages: 2 } };
    let removed = false;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const query = new URL(String(url), "http://localhost").searchParams;
      if (query.get("page") === "2") { removed = true; return { ok: true, json: async () => ({ data: [], pagination: { page: 2, limit: 20, total: 1, totalPages: 1 } }) } as Response; }
      return { ok: true, json: async () => removed ? initial : twoPages } as Response;
    });
    render(<TasksPanel initial={twoPages} events={events} members={[]} canManage timeZone="UTC" />);
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "HIGH" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("page=2") && String(url).includes("priority=HIGH"))).toBe(true));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("page=1") && String(url).includes("priority=HIGH")).length).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument());
    expect(screen.getByText("Confirm venue")).toBeVisible();
  });
});
