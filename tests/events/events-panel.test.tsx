import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

import EventsPanel from "@/app/(dashboard)/dashboard/events/events-panel";

const coordinator = { id: "507f1f77bcf86cd799439011", name: "QA Coordinator" };
const event = {
  id: "507f1f77bcf86cd799439012", name: "Haldi ceremony", type: "HALDI",
  startsAt: "2030-01-02T10:00:00.000Z", endsAt: "2030-01-02T11:30:00.000Z",
  venueName: "Garden", address: "Main Road", description: "Bring flowers", dressCode: "Yellow",
  coordinatorIds: [coordinator.id],
};

describe("event management interface", () => {
  beforeEach(() => {
    mocks.refresh.mockReset();
    vi.restoreAllMocks();
  });

  it("shows real details in the wedding time zone and hides controls for coordinators", () => {
    render(<EventsPanel events={[event]} coordinators={[]} canManage={false} timeZone="Asia/Kolkata" />);
    expect(screen.getByRole("heading", { name: "Haldi ceremony" })).toBeVisible();
    expect(screen.getByText(/Garden.*Main Road/)).toBeVisible();
    expect(screen.getByText("Dress code: Yellow")).toBeVisible();
    expect(screen.getByText("Bring flowers")).toBeVisible();
    expect(screen.getByText(/Asia\/Kolkata/)).toHaveTextContent("3:30 PM");
    expect(screen.queryByRole("button", { name: /create event/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit|archive/i })).not.toBeInTheDocument();
  });

  it("validates required dates without sending an invalid event", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<EventsPanel events={[]} coordinators={[coordinator]} canManage timeZone="UTC" />);
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid start and end date and time.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits a complete event and coordinator assignment", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ data: {} }) } as Response);
    render(<EventsPanel events={[]} coordinators={[coordinator]} canManage timeZone="UTC" />);
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: "Reception" } });
    fireEvent.change(screen.getByLabelText(/event type/i), { target: { value: "RECEPTION" } });
    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: "2030-01-02T10:00" } });
    fireEvent.change(screen.getByLabelText(/ends/i), { target: { value: "2030-01-02T11:30" } });
    fireEvent.change(screen.getByLabelText(/^venue$/i), { target: { value: "Garden" } });
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: "Main Road" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Bring flowers" } });
    fireEvent.change(screen.getByLabelText(/dress code/i), { target: { value: "Yellow" } });
    fireEvent.click(screen.getByLabelText("QA Coordinator"));
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/events");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toMatchObject({ name: "Reception", type: "RECEPTION", venueName: "Garden", address: "Main Road", description: "Bring flowers", dressCode: "Yellow", coordinatorIds: [coordinator.id] });
  });

  it("edits an event and surfaces API errors", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Unable to save this event" } }) } as Response);
    render(<EventsPanel events={[event]} coordinators={[coordinator]} canManage timeZone="UTC" />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText(/event name/i)).toHaveValue("Haldi ceremony");
    expect(screen.getByLabelText("QA Coordinator")).toBeChecked();
    fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: "Edited ceremony" } });
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save this event");
    expect(fetchMock).toHaveBeenCalledWith(`/api/events/${event.id}`, expect.objectContaining({ method: "PATCH" }));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("archives only after confirmation", async () => {
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    render(<EventsPanel events={[event]} coordinators={[coordinator]} canManage timeZone="UTC" />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    expect(confirmMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(`/api/events/${event.id}`, { method: "DELETE" });
  });
});
