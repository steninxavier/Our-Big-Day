import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ memberFindOne: vi.fn(), memberFind: vi.fn(), userFind: vi.fn(), invitationFind: vi.fn(), weddingExists: vi.fn() }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { findOne: mocks.memberFindOne, find: mocks.memberFind } }));
vi.mock("@/modules/members/models/member-invitation.model", () => ({ MemberInvitationModel: { find: mocks.invitationFind } }));
vi.mock("@/modules/auth/models/user.model", () => ({ UserModel: { find: mocks.userFind } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { exists: mocks.weddingExists } }));
import { listPendingMemberInvitations, listWeddingMembers } from "@/modules/members/member-directory.service";

const id = (value: string) => ({ toString: () => value });
const chain = (value: unknown) => ({ lean() { return this; }, select() { return this; }, sort() { return this; }, exec: async () => value });

describe("wedding member directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.memberFindOne.mockReturnValue(chain({ weddingId: "wedding-1", role: "ADMIN" }));
    mocks.weddingExists.mockResolvedValue(true);
    mocks.memberFind.mockReturnValue(chain([
      { _id: id("m-2"), userId: id("user-2"), role: "MANAGER", joinedAt: new Date("2026-01-02") },
      { _id: id("m-1"), userId: id("user-1"), role: "ADMIN", joinedAt: new Date("2026-01-01") },
    ]));
    mocks.userFind.mockReturnValue(chain([{ _id: id("user-1"), name: "Liya", email: "liya@example.com" }, { _id: id("user-2"), name: "John", email: "john@example.com" }]));
    mocks.invitationFind.mockReturnValue(chain([{ _id: id("i-1"), emailNormalized: "invited@example.com", role: "MANAGER", expiresAt: new Date("2030-01-01") }]));
  });
  it("derives the wedding from the session user and lists that user first", async () => {
    const members = await listWeddingMembers("user-1");
    expect(mocks.memberFind).toHaveBeenCalledWith({ weddingId: "wedding-1" });
    expect(members).toHaveLength(2);
    expect(members[0]).toMatchObject({ user: { id: "user-1", name: "Liya" }, role: "ADMIN" });
  });
  it("refuses access without a membership or to a deleted wedding", async () => {
    mocks.memberFindOne.mockReturnValue(chain(null));
    await expect(listWeddingMembers("other")).rejects.toMatchObject({ code: "FORBIDDEN" });
    mocks.memberFindOne.mockReturnValue(chain({ weddingId: "wedding-1", role: "ADMIN" }));
    mocks.weddingExists.mockResolvedValue(false);
    await expect(listWeddingMembers("user-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.memberFind).not.toHaveBeenCalled();
  });
  it("shows only unexpired pending invitations for the admin's wedding", async () => {
    const invitations = await listPendingMemberInvitations("user-1");
    expect(mocks.invitationFind).toHaveBeenCalledWith({ weddingId: "wedding-1", status: "PENDING", expiresAt: { $gt: expect.any(Date) } });
    expect(invitations).toEqual([{ id: "i-1", email: "invited@example.com", role: "MANAGER", status: "PENDING", expiresAt: "2030-01-01T00:00:00.000Z" }]);
    expect(invitations[0]).not.toHaveProperty("tokenHash");
  });
  it("does not disclose pending invitations to managers", async () => {
    mocks.memberFindOne.mockReturnValue(chain({ weddingId: "wedding-1", role: "MANAGER" }));
    await expect(listPendingMemberInvitations("user-2")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.invitationFind).not.toHaveBeenCalled();
  });
  it("does not disclose members or invitations to coordinators", async () => {
    mocks.memberFindOne.mockReturnValue(chain({ weddingId: "wedding-1", role: "EVENT_COORDINATOR" }));
    await expect(listWeddingMembers("coordinator")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listPendingMemberInvitations("coordinator")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.memberFind).not.toHaveBeenCalled();
    expect(mocks.invitationFind).not.toHaveBeenCalled();
  });
});
