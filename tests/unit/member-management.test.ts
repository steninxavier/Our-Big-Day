import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ find: vi.fn(), count: vi.fn(), remove: vi.fn(), weddingUpdate: vi.fn(), invitationUpdate: vi.fn(), end: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: async () => ({ startSession: async () => ({ withTransaction: mocks.transaction, endSession: mocks.end }) }) }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { findOne: mocks.find, countDocuments: mocks.count, deleteOne: mocks.remove } }));
vi.mock("@/modules/members/models/member-invitation.model", () => ({ MemberInvitationModel: { updateOne: mocks.invitationUpdate } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { updateOne: mocks.weddingUpdate } }));
import { removeWeddingMember, revokeMemberInvitation } from "@/modules/members/member-management.service";

const query = (value: unknown) => ({ session: vi.fn().mockReturnThis(), exec: async () => value });

describe("wedding member management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: () => Promise<void>) => fn());
    mocks.find.mockReset().mockReturnValueOnce(query({ weddingId: "wedding-1" })).mockReturnValue(query({ role: "MANAGER" }));
    mocks.count.mockReturnValue(query(2));
    mocks.remove.mockReturnValue(query({ deletedCount: 1 }));
    mocks.weddingUpdate.mockResolvedValue({ matchedCount: 1 });
    mocks.invitationUpdate.mockResolvedValue({ modifiedCount: 1 });
  });

  it("removes a member only from the admin's wedding within the transaction", async () => {
    await removeWeddingMember("admin-1", "member-1");
    expect(mocks.find).toHaveBeenNthCalledWith(1, { userId: "admin-1", role: "ADMIN" });
    expect(mocks.weddingUpdate).toHaveBeenCalledWith({ _id: "wedding-1", deletedAt: null }, { $inc: { membershipRevision: 1 } }, expect.objectContaining({ session: expect.anything() }));
    expect(mocks.find).toHaveBeenNthCalledWith(2, { _id: "member-1", weddingId: "wedding-1" });
    expect(mocks.remove).toHaveBeenCalledWith({ _id: "member-1", weddingId: "wedding-1" });
    expect(mocks.end).toHaveBeenCalled();
  });
  it("refuses removal and revocation without admin membership", async () => {
    mocks.find.mockReset().mockReturnValue(query(null));
    await expect(removeWeddingMember("manager", "member-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(revokeMemberInvitation("coordinator", "invite-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.weddingUpdate).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.invitationUpdate).not.toHaveBeenCalled();
  });
  it("does not remove the last admin", async () => {
    mocks.find.mockReset().mockReturnValueOnce(query({ weddingId: "wedding-1" })).mockReturnValueOnce(query({ role: "ADMIN" }));
    mocks.count.mockReturnValue(query(1));
    await expect(removeWeddingMember("admin-1", "member-1")).rejects.toMatchObject({ code: "LAST_ADMIN", status: 409 });
    expect(mocks.count).toHaveBeenCalledWith({ weddingId: "wedding-1", role: "ADMIN" });
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.end).toHaveBeenCalled();
  });
  it("allows removal of an admin when another exists", async () => {
    mocks.find.mockReset().mockReturnValueOnce(query({ weddingId: "wedding-1" })).mockReturnValueOnce(query({ role: "ADMIN" }));
    await removeWeddingMember("admin-1", "member-2");
    expect(mocks.remove).toHaveBeenCalled();
  });
  it("does not reveal a missing or cross-wedding member", async () => {
    mocks.find.mockReset().mockReturnValueOnce(query({ weddingId: "wedding-1" })).mockReturnValueOnce(query(null));
    await expect(removeWeddingMember("admin-1", "other")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("revokes only a pending invitation in the admin's wedding", async () => {
    await revokeMemberInvitation("admin-1", "invite-1");
    expect(mocks.invitationUpdate).toHaveBeenCalledWith({ _id: "invite-1", weddingId: "wedding-1", status: "PENDING" }, { $set: { status: "REVOKED" } }, expect.objectContaining({ session: expect.anything() }));
  });
  it("rejects an already used, revoked, missing, or foreign invitation", async () => {
    mocks.invitationUpdate.mockResolvedValue({ modifiedCount: 0 });
    await expect(revokeMemberInvitation("admin-1", "invite-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("refuses a deleted wedding before mutating anything", async () => {
    mocks.weddingUpdate.mockResolvedValue({ matchedCount: 0 });
    await expect(removeWeddingMember("admin-1", "member-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
