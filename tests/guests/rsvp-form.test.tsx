import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RsvpForm from "@/app/invite/[token]/rsvp-form";
import ShareInvitation from "@/app/(dashboard)/dashboard/guests/share-invitation";

describe("guest RSVP and sharing", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it("submits an attending RSVP and shows confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { status: "ATTENDING", attendingCount: 2 } }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<RsvpForm token={"a".repeat(43)} initial={{ name: "Guest", maxGuests: 3, status: "PENDING", attendingCount: null }} />);
    fireEvent.click(screen.getByLabelText("Joyfully attending"));
    fireEvent.change(screen.getByLabelText(/number attending/i), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save response" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("response has been saved"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/rsvp$/), expect.objectContaining({ method: "POST", body: JSON.stringify({ status: "ATTENDING", attendingCount: 2 }) }));
  });
  it("warns that localhost cannot be shared to other devices", async () => {
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { url: `http://localhost:3000/invite/${"a".repeat(43)}`, localOnly: true } }) }));
    render(<ShareInvitation guestId="guest1" name="Guest" />);
    fireEvent.click(screen.getByRole("button", { name: "Share invitation for Guest" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("will not work on another person’s device");
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("rel", "noopener noreferrer");
  });
});
