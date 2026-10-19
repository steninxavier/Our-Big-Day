import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuestsPanel from "@/app/(dashboard)/dashboard/guests/guests-panel";

const initial = { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, summary: { total: 0, capacity: 0, pending: 0, attending: 0, notAttending: 0, confirmedAttendees: 0 } };
describe("guest list interface", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it("submits a guest party with selected events and no optional contact details", async () => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
    const fetchMock = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => options?.method === "POST" ? { ok: true, json: async () => ({ data: {} }) } : { ok: true, json: async () => initial });
    vi.stubGlobal("fetch", fetchMock);
    render(<GuestsPanel initial={initial} events={[{ id: "0123456789abcdef01234567", name: "Reception" }]} />);
    fireEvent.click(screen.getAllByRole("button", { name: /add guest party/i })[0]);
    fireEvent.change(screen.getByLabelText(/guest or primary contact name/i), { target: { value: "Suresh & family" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Reception" }));
    fireEvent.click(screen.getByRole("button", { name: "Save guest party" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/guests", expect.objectContaining({ method: "POST", body: expect.stringContaining('"invitedEventIds":["0123456789abcdef01234567"]') })));
  });
});
