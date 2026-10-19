import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ member: vi.fn(), exists: vi.fn(), find: vi.fn(), create: vi.fn(), count: vi.fn(), update: vi.fn() }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { findOne: mocks.member, countDocuments: mocks.count } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { exists: mocks.exists } }));
vi.mock("@/modules/events/models/event.model", () => ({ EventModel: { find: mocks.find, create: mocks.create, updateOne: mocks.update } }));
import { archiveEvent, createEvent, getEvent, listEvents } from "@/modules/events/event.service";

describe("event authorization", () => {
  const member = { _id: "coordinator-id", weddingId: "wedding-one", role: "EVENT_COORDINATOR" };
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.member.mockReturnValue({ lean: () => ({ exec: async () => member }) });
    mocks.exists.mockResolvedValue(true);
    mocks.find.mockReturnValue({ sort: () => ({ lean: () => ({ exec: async () => [] }) }) });
  });
  it("filters a coordinator's events by both wedding and their membership", async () => {
    await listEvents("user-one");
    expect(mocks.find).toHaveBeenCalledWith({ weddingId: "wedding-one", archivedAt: null, coordinatorIds: "coordinator-id" });
    await expect(getEvent("user-one", "507f1f77bcf86cd799439011")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("forbids coordinators from creating and archiving events", async () => {
    await expect(createEvent("user-one", { name: "A", startsAt: "2027-01-01T00:00:00Z", coordinatorIds: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(archiveEvent("user-one", "507f1f77bcf86cd799439011")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects coordinator assignments that are not active coordinators in the same wedding", async () => {
    mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ ...member, role: "ADMIN" }) }) });
    mocks.count.mockReturnValue({ exec: async () => 0 });
    await expect(createEvent("user-one", { name: "A", startsAt: "2027-01-01T00:00:00Z", coordinatorIds: ["507f1f77bcf86cd799439011"] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.count).toHaveBeenCalledWith(expect.objectContaining({ weddingId: "wedding-one", role: "EVENT_COORDINATOR" }));
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
