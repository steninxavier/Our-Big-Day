import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { guestPatchSchema, guestQuerySchema, guestSchema } from "@/modules/guests/schemas";

const mocks = vi.hoisted(() => ({ member: vi.fn(), wedding: vi.fn(), eventCount: vi.fn(), eventFind: vi.fn(), find: vi.fn(), findOne: vi.fn(), count: vi.fn(), aggregate: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { findOne: mocks.member } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { exists: mocks.wedding } }));
vi.mock("@/modules/events/models/event.model", () => ({ EventModel: { countDocuments: mocks.eventCount, find: mocks.eventFind } }));
vi.mock("@/modules/guests/models/guest.model", () => ({ GuestModel: { find: mocks.find, findOne: mocks.findOne, countDocuments: mocks.count, aggregate: mocks.aggregate, create: mocks.create, findOneAndUpdate: mocks.update, deleteOne: mocks.delete } }));
import { createGuest, deleteGuest, getGuest, listGuests, patchGuest } from "@/modules/guests/guest.service";

describe("guest validation", () => {
  it("allows no contact or events and normalizes email", () => {
    expect(guestSchema.parse({ name: "  Suresh  " })).toMatchObject({ name: "Suresh", email: "", phone: "", maxGuests: 1, invitedEventIds: [] });
    expect(guestSchema.parse({ name: "A", email: "Test@Example.com" }).email).toBe("test@example.com");
  });
  it("rejects invalid capacity, repeated events, forged RSVP and unsupported query values", () => {
    const id = new Types.ObjectId().toString();
    expect(guestSchema.safeParse({ name: "A", maxGuests: 0 }).success).toBe(false);
    expect(guestSchema.safeParse({ name: "A", invitedEventIds: [id, id] }).success).toBe(false);
    expect(guestSchema.safeParse({ name: "A", rsvpStatus: "ATTENDING" }).success).toBe(false);
    expect(guestPatchSchema.safeParse({ expectedRevision: 0, weddingId: id }).success).toBe(false);
    expect(guestQuerySchema.safeParse({ eventId: "not-an-id" }).success).toBe(false);
  });
});
describe("guest access and concurrency", () => {
  const weddingId = new Types.ObjectId();
  const guestId = new Types.ObjectId().toString();
  const eventId = new Types.ObjectId().toString();
  function role(value: string) { mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ weddingId, role: value }) }) }); }
  beforeEach(() => { vi.clearAllMocks(); role("ADMIN"); mocks.wedding.mockResolvedValue(true); mocks.eventCount.mockReturnValue({ exec: async () => 0 }); mocks.findOne.mockReturnValue({ lean: () => ({ exec: async () => null }) }); });
  it("rejects coordinators before any guest read or write", async () => {
    role("EVENT_COORDINATOR");
    await expect(listGuests("user", { page: 1, limit: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getGuest("user", guestId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createGuest("user", guestSchema.parse({ name: "A" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(patchGuest("user", guestId, { name: "B" }, 0)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deleteGuest("user", guestId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.find).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("scopes direct lookup to the caller's wedding", async () => {
    await expect(getGuest("user", guestId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.findOne).toHaveBeenCalledWith({ _id: guestId, weddingId });
  });
  it("scopes list filters and escapes literal search characters", async () => {
    role("MANAGER");
    mocks.find.mockReturnValue({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => ({ exec: async () => [] }) }) }) }) });
    mocks.count.mockReturnValue({ exec: async () => 0 });
    mocks.aggregate.mockResolvedValue([]);
    mocks.eventFind.mockReturnValue({ select: () => ({ lean: () => ({ exec: async () => [] }) }) });
    await listGuests("user", { page: 1, limit: 20, search: "a.*", rsvpStatus: "PENDING", eventId });
    expect(mocks.find).toHaveBeenCalledWith({ $and: [{ weddingId }, { $or: ["name", "email", "phone"].map((field) => ({ [field]: { $regex: "a\\.\\*", $options: "i" } })) }, { rsvpStatus: "PENDING" }, { invitedEventIds: new Types.ObjectId(eventId) }] });
  });
  it("rejects event associations outside the wedding", async () => {
    await expect(createGuest("user", guestSchema.parse({ name: "A", invitedEventIds: [eventId] }))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.eventCount).toHaveBeenCalledWith({ _id: { $in: [eventId] }, weddingId, archivedAt: null });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects stale guest edits and capacity below existing attendance", async () => {
    role("MANAGER"); mocks.findOne.mockReturnValue({ lean: () => ({ exec: async () => ({ revision: 2, numberAttending: 3, invitedEventIds: [] }) }) });
    await expect(patchGuest("user", guestId, { name: "A" }, 1)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(patchGuest("user", guestId, { maxGuests: 2 }, 2)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("uses an atomic revision guard for concurrent edits", async () => {
    mocks.findOne.mockReturnValue({ lean: () => ({ exec: async () => ({ revision: 2, numberAttending: null, invitedEventIds: [] }) }) });
    mocks.update.mockReturnValue({ lean: () => ({ exec: async () => null }) });
    await expect(patchGuest("user", guestId, { name: "A" }, 2)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.update).toHaveBeenCalledWith({ _id: guestId, weddingId, revision: 2 }, { $set: { name: "A" }, $inc: { revision: 1 } }, expect.any(Object));
  });
  it("clears old email status on address changes and does not change it while sending", async () => {
    mocks.findOne.mockReturnValue({ lean: () => ({ exec: async () => ({ revision: 2, email: "old@example.com", numberAttending: null, invitedEventIds: [] }) }) });
    mocks.update.mockReturnValue({ lean: () => ({ exec: async () => null }) });
    await expect(patchGuest("user", guestId, { email: "new@example.com" }, 2)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ weddingId, $and: [expect.objectContaining({ $or: expect.any(Array) })] }),
      expect.objectContaining({ $set: { email: "new@example.com", invitationSentAt: null, lastReminderSentAt: null, reminderCount: 0 } }),
      expect.any(Object),
    );
  });
});
