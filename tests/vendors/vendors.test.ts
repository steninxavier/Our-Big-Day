import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";
import { vendorPatchSchema, vendorQuerySchema, vendorSchema } from "@/modules/vendors/schemas";

const mocks = vi.hoisted(() => ({ member: vi.fn(), wedding: vi.fn(), eventCount: vi.fn(), vendorFind: vi.fn(), vendorFindOne: vi.fn(), vendorCount: vi.fn(), vendorAggregate: vi.fn(), vendorCreate: vi.fn(), vendorUpdate: vi.fn() }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { findOne: mocks.member } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { exists: mocks.wedding } }));
vi.mock("@/modules/events/models/event.model", () => ({ EventModel: { countDocuments: mocks.eventCount, find: vi.fn() } }));
vi.mock("@/modules/vendors/models/vendor.model", () => ({ VendorModel: { find: mocks.vendorFind, findOne: mocks.vendorFindOne, countDocuments: mocks.vendorCount, aggregate: mocks.vendorAggregate, create: mocks.vendorCreate, findOneAndUpdate: mocks.vendorUpdate } }));
import { archiveVendor, createVendor, getVendor, patchVendor } from "@/modules/vendors/vendor.service";

const input = { name: " Malabar Frames ", category: "PHOTOGRAPHER" as const };
describe("vendor validation", () => {
  it("normalizes input and defaults optional fields", () => { expect(vendorSchema.parse(input)).toMatchObject({ name: "Malabar Frames", eventIds: [], totalAgreedCostPaise: null, notes: "" }); });
  it("rejects tenant IDs, duplicate event links, invalid websites, and empty patches", () => {
    expect(vendorSchema.safeParse({ ...input, weddingId: new Types.ObjectId().toString() }).success).toBe(false);
    const eventId = new Types.ObjectId().toString(); expect(vendorSchema.safeParse({ ...input, eventIds: [eventId, eventId] }).success).toBe(false);
    expect(vendorSchema.safeParse({ ...input, website: "not-a-url" }).success).toBe(false);
    expect(vendorPatchSchema.safeParse({ expectedRevision: 0 }).success).toBe(false);
    expect(vendorQuerySchema.parse({ includeArchived: "true" }).includeArchived).toBe(true);
  });
});
describe("vendor authorization and history", () => {
  const weddingId = new Types.ObjectId(); const vendorId = new Types.ObjectId().toString();
  function role(value: string) { mocks.member.mockReturnValue({ lean: () => ({ exec: async () => ({ weddingId, role: value }) }) }); }
  beforeEach(() => { vi.clearAllMocks(); role("ADMIN"); mocks.wedding.mockResolvedValue(true); mocks.eventCount.mockReturnValue({ exec: async () => 0 }); mocks.vendorFindOne.mockReturnValue({ lean: () => ({ exec: async () => null }) }); });
  it("rejects coordinators before vendor access", async () => {
    role("EVENT_COORDINATOR");
    for (const action of [() => getVendor("user", vendorId), () => createVendor("user", vendorSchema.parse(input)), () => patchVendor("user", vendorId, { name: "New" }, 0), () => archiveVendor("user", vendorId)]) await expect(action()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.vendorFindOne).not.toHaveBeenCalled();
  });
  it("scopes direct lookups and atomically rejects stale edits", async () => {
    await expect(getVendor("user", vendorId)).rejects.toMatchObject({ code: "NOT_FOUND" }); expect(mocks.vendorFindOne).toHaveBeenCalledWith({ _id: vendorId, weddingId });
    mocks.vendorFindOne.mockReturnValue({ lean: () => ({ exec: async () => ({ revision: 2, eventIds: [] }) }) });
    await expect(patchVendor("user", vendorId, { name: "Changed" }, 1)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.vendorUpdate).not.toHaveBeenCalled();
  });
  it("requires active events before creating links", async () => {
    const eventId = new Types.ObjectId().toString();
    await expect(createVendor("user", vendorSchema.parse({ ...input, eventIds: [eventId] }))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.eventCount).toHaveBeenCalledWith({ _id: { $in: [eventId] }, weddingId, archivedAt: null });
  });
});
