import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

const mocks = vi.hoisted(() => ({ member: vi.fn(), wedding: vi.fn(), guest: vi.fn(), claim: vi.fn(), update: vi.fn(), link: vi.fn(), config: vi.fn(), send: vi.fn() }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { findOne: mocks.member } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { findOne: mocks.wedding } }));
vi.mock("@/modules/guests/models/guest.model", () => ({ GuestModel: { findOne: mocks.guest, findOneAndUpdate: mocks.claim, updateOne: mocks.update } }));
vi.mock("@/modules/guests/invitation.service", () => ({ getOrCreateInvitationLink: mocks.link }));
vi.mock("@/server/email/guest-invitation", () => ({ guestEmailConfiguration: mocks.config, sendGuestInvitationEmail: mocks.send }));
import { sendGuestEmail } from "@/modules/guests/guest-email.service";

describe("individual guest email", () => {
  const weddingId = new Types.ObjectId();
  const guestId = new Types.ObjectId().toString();
  const guest = { email: "guest@example.com", name: "A guest", rsvpStatus: "PENDING" };
  const plain = (value: unknown) => ({ lean: () => ({ exec: async () => value }) });
  const selected = (value: unknown) => ({ select: () => plain(value) });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.member.mockReturnValue(plain({ role: "ADMIN", weddingId }));
    mocks.wedding.mockReturnValue(selected({ brideName: "Liya", groomName: "John", weddingDate: "2027-02-14" }));
    mocks.guest.mockReturnValue(plain(guest));
    mocks.claim.mockReturnValue(plain(guest));
    mocks.update.mockReturnValue({ exec: async () => ({ matchedCount: 1 }) });
    mocks.link.mockResolvedValue({ url: "https://example.com/invite/private-token", localOnly: false });
    mocks.send.mockResolvedValue(undefined);
  });
  it("blocks coordinators and scopes the guest to the member's wedding", async () => {
    mocks.member.mockReturnValue(plain({ role: "EVENT_COORDINATOR", weddingId }));
    await expect(sendGuestEmail("user", guestId, "invitation")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.guest).not.toHaveBeenCalled();
    mocks.member.mockReturnValue(plain({ role: "MANAGER", weddingId }));
    mocks.guest.mockReturnValue(plain(null));
    await expect(sendGuestEmail("user", guestId, "invitation")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.guest).toHaveBeenCalledWith({ _id: guestId, weddingId });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("requires a guest email and a pending RSVP for reminders", async () => {
    mocks.guest.mockReturnValue(plain({ ...guest, email: "" }));
    await expect(sendGuestEmail("user", guestId, "invitation")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    mocks.guest.mockReturnValue(plain({ ...guest, rsvpStatus: "ATTENDING" }));
    await expect(sendGuestEmail("user", guestId, "reminder")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("claims a scoped lock and records acceptance only after the provider accepts", async () => {
    const result = await sendGuestEmail("user", guestId, "invitation");
    expect(result.acceptedAt).toBeTruthy();
    expect(mocks.claim).toHaveBeenCalledWith(expect.objectContaining({ _id: guestId, weddingId, email: guest.email }), expect.any(Object), expect.any(Object));
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ email: guest.email, kind: "invitation", url: "https://example.com/invite/private-token" }));
    expect(mocks.update.mock.calls[0][1]).toEqual(expect.objectContaining({ $set: { invitationSentAt: expect.any(Date) } }));
  });
  it("records reminder count and refuses concurrent claims", async () => {
    await sendGuestEmail("user", guestId, "reminder");
    expect(mocks.claim.mock.calls[0][0]).toEqual(expect.objectContaining({ rsvpStatus: "PENDING" }));
    expect(mocks.update.mock.calls[0][1]).toEqual(expect.objectContaining({ $inc: { reminderCount: 1 }, $set: { lastReminderSentAt: expect.any(Date) } }));
    mocks.claim.mockReturnValue(plain(null)); mocks.send.mockClear();
    await expect(sendGuestEmail("user", guestId, "reminder")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("never records acceptance on provider failure or a local link", async () => {
    mocks.send.mockRejectedValue(new Error("provider failed"));
    await expect(sendGuestEmail("user", guestId, "invitation")).rejects.toThrow("provider failed");
    expect(mocks.update).toHaveBeenCalledTimes(1);
    mocks.send.mockClear(); mocks.update.mockClear();
    mocks.link.mockResolvedValue({ url: "http://localhost:3000/invite/token", localOnly: true });
    await expect(sendGuestEmail("user", guestId, "invitation")).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("warns when provider acceptance cannot be recorded", async () => {
    mocks.update.mockReturnValueOnce({ exec: async () => { throw new Error("database unavailable"); } });
    await expect(sendGuestEmail("user", guestId, "invitation")).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: expect.stringMatching(/check with the guest/i) });
  });
});
