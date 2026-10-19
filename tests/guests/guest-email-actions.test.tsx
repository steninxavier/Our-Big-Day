import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuestEmailActions from "@/app/(dashboard)/dashboard/guests/guest-email-actions";

const props = { guestId: "123", name: "Guest", email: "guest@example.com", rsvpStatus: "PENDING", invitationSentAt: null, onSent: vi.fn() };
describe("guest email controls", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("confirms the recipient and shows provider acceptance without claiming delivery", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { acceptedAt: "date" } }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<GuestEmailActions {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Email invitation for Guest" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/guests/123/send-invitation", { method: "POST" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Delivery is not confirmed");
  });
  it("does not send after cancelling and hides reminder for responded guests", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    render(<GuestEmailActions {...props} rsvpStatus="ATTENDING" />);
    expect(screen.queryByRole("button", { name: /reminder/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Email invitation for Guest" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("explains why a guest without email cannot be sent an invitation", () => {
    render(<GuestEmailActions {...props} email="" />);
    expect(screen.getByText("Add an email to send an invitation.")).toBeInTheDocument();
  });
  it("warns that an interrupted request may already have sent an email", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<GuestEmailActions {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Email invitation for Guest" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Check with the guest before retrying");
  });
});
