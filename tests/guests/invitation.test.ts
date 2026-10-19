import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { rsvpSchema } from "@/modules/guests/rsvp.schemas";

const mocks = vi.hoisted(() => ({ member: vi.fn(), weddingExists: vi.fn(), weddingFind: vi.fn(), guestFind: vi.fn(), guestUpdate: vi.fn(), events: vi.fn(), limit: vi.fn() }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { findOne: mocks.member } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { exists: mocks.weddingExists, findOne: mocks.weddingFind } }));
vi.mock("@/modules/events/models/event.model", () => ({ EventModel: { find: mocks.events } }));
vi.mock("@/modules/guests/models/guest.model", () => ({ GuestModel: { findOne: mocks.guestFind, findOneAndUpdate: mocks.guestUpdate } }));
vi.mock("@/modules/guests/rsvp-rate", () => ({ limitRsvp: mocks.limit }));
import { getInvitation, getOrCreateInvitationLink, submitRsvp } from "@/modules/guests/invitation.service";

describe("private guest invitation", () => {
  const token = "A".repeat(43);
  const weddingId = new Types.ObjectId();
  const guestId = new Types.ObjectId();
  const eventId = new Types.ObjectId();
  const guest = { _id: guestId, weddingId, name: "Guest", maxGuests: 3, invitedEventIds: [eventId], rsvpStatus: "PENDING", numberAttending: null, revision: 4 };
  const wedding = { brideName: "Liya", groomName: "John", weddingDate: "2027-01-01", timeZone: "Asia/Kolkata" };
  const result = (value: unknown) => ({ select: () => ({ lean: () => ({ exec: async () => value }) }) });
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv("APP_URL", "http://localhost:3000");
    mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ role: "ADMIN", weddingId }) }) });
    mocks.weddingExists.mockResolvedValue(true);
    mocks.guestFind.mockReturnValue(result(guest)); mocks.weddingFind.mockReturnValue(result(wedding));
    mocks.events.mockReturnValue({ select: () => ({ sort: () => ({ lean: () => ({ exec: async () => [] }) }) }) });
  });
  it("validates attendance and disallows additional fields", () => {
    expect(rsvpSchema.safeParse({ status: "ATTENDING", attendingCount: 0 }).success).toBe(false);
    expect(rsvpSchema.safeParse({ status: "NOT_ATTENDING", attendingCount: 1 }).success).toBe(false);
    expect(rsvpSchema.safeParse({ status: "ATTENDING", attendingCount: 1, weddingId: "forged" }).success).toBe(false);
  });
  it("returns only scoped public fields and active invited events", async () => {
    const data = await getInvitation(token);
    expect(mocks.guestFind).toHaveBeenCalledWith({ invitationToken: token });
    expect(mocks.events).toHaveBeenCalledWith({ _id: { $in: [eventId] }, weddingId, archivedAt: null });
    expect(data.guest).toEqual({ name: "Guest", maxGuests: 3, status: "PENDING", attendingCount: null });
    expect(JSON.stringify(data)).not.toContain(token);
    expect(JSON.stringify(data)).not.toContain(weddingId.toString());
  });
  it("rejects malformed or unavailable tokens without exposing information", async () => {
    await expect(getInvitation("invalid")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.guestFind).not.toHaveBeenCalled();
    mocks.guestFind.mockReturnValue(result(null));
    await expect(getInvitation(token)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects coordinators and cross-wedding sharing", async () => {
    mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ role: "EVENT_COORDINATOR", weddingId }) }) });
    await expect(getOrCreateInvitationLink("user", guestId.toString())).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.guestFind).not.toHaveBeenCalled();
    mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ role: "MANAGER", weddingId }) }) });
    mocks.guestFind.mockReturnValue(result(null));
    await expect(getOrCreateInvitationLink("user", guestId.toString())).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.guestFind).toHaveBeenCalledWith({ _id: guestId.toString(), weddingId });
  });
  it("returns an existing stable link and warns about localhost", async () => {
    mocks.guestFind.mockReturnValue(result({ ...guest, invitationToken: token }));
    expect(await getOrCreateInvitationLink("user", guestId.toString())).toEqual({ url: `http://localhost:3000/invite/${token}`, localOnly: true });
    expect(mocks.guestUpdate).not.toHaveBeenCalled();
  });
  it("generates a high-entropy link only for the scoped guest", async () => {
    mocks.guestUpdate.mockImplementation((_filter, update) => result({ ...guest, invitationToken: update.$set.invitationToken }));
    const link = await getOrCreateInvitationLink("user", guestId.toString());
    expect(link.url).toMatch(/^http:\/\/localhost:3000\/invite\/[A-Za-z0-9_-]{43}$/);
    expect(mocks.guestUpdate).toHaveBeenCalledWith({ _id: guestId.toString(), weddingId, invitationToken: { $exists: false } }, expect.any(Object), { returnDocument: "after" });
  });
  it("enforces capacity before rate use and protects concurrent edits", async () => {
    await expect(submitRsvp(token, { status: "ATTENDING", attendingCount: 4 })).rejects.toMatchObject({ code: "PARTY_SIZE_CHANGED" });
    expect(mocks.limit).not.toHaveBeenCalled();
    mocks.guestUpdate.mockReturnValue({ lean: () => ({ exec: async () => null }) });
    await expect(submitRsvp(token, { status: "ATTENDING", attendingCount: 2 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.guestUpdate).toHaveBeenCalledWith(expect.objectContaining({ _id: guestId, weddingId, invitationToken: token, revision: 4, maxGuests: { $gte: 2 } }), expect.objectContaining({ $inc: { revision: 1 } }), expect.any(Object));
  });
  it("does not rewrite identical responses, but still applies rate limiting", async () => {
    mocks.guestFind.mockReturnValue(result({ ...guest, rsvpStatus: "ATTENDING", numberAttending: 2 }));
    expect(await submitRsvp(token, { status: "ATTENDING", attendingCount: 2 })).toMatchObject({ status: "ATTENDING", attendingCount: 2 });
    expect(mocks.limit).toHaveBeenCalledWith(token); expect(mocks.guestUpdate).not.toHaveBeenCalled();
  });
  it("saves a valid RSVP and returns the saved state", async () => {
    const date = new Date("2027-01-01T00:00:00Z");
    mocks.guestUpdate.mockReturnValue({ lean: () => ({ exec: async () => ({ ...guest, rsvpStatus: "ATTENDING", numberAttending: 2, rsvpUpdatedAt: date }) }) });
    expect(await submitRsvp(token, { status: "ATTENDING", attendingCount: 2 })).toEqual({ status: "ATTENDING", attendingCount: 2, updatedAt: date.toISOString() });
  });
});
