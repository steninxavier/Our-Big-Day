import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  inviteFind: vi.fn(), inviteCreate: vi.fn(), inviteUpdate: vi.fn(), inviteUpdateMany: vi.fn(),
  memberFind: vi.fn(), memberExists: vi.fn(), memberCreate: vi.fn(),
  userFind: vi.fn(), weddingFind: vi.fn(), weddingExists: vi.fn(), send: vi.fn(), configure: vi.fn(),
  end: vi.fn(),
}));
vi.mock("@/modules/members/models/member-invitation.model", () => ({ MemberInvitationModel: { init: vi.fn(), findOne: mocks.inviteFind, create: mocks.inviteCreate, updateOne: mocks.inviteUpdate, updateMany: mocks.inviteUpdateMany } }));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({ WeddingMembershipModel: { init: vi.fn(), findOne: mocks.memberFind, exists: mocks.memberExists, create: mocks.memberCreate } }));
vi.mock("@/modules/auth/models/user.model", () => ({ UserModel: { findOne: mocks.userFind } }));
vi.mock("@/modules/weddings/models/wedding.model", () => ({ WeddingModel: { findOne: mocks.weddingFind, exists: mocks.weddingExists } }));
vi.mock("@/server/email/member-invitation", () => ({ sendMemberInvitation: mocks.send, memberInvitationConfiguration: mocks.configure }));
vi.mock("@/server/auth/tokens", () => ({ createOpaqueToken: () => "a".repeat(43) }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: async () => ({ startSession: async () => ({ withTransaction: async (fn: () => Promise<void>) => fn(), endSession: mocks.end }) }) }));

import { inviteMember, getMemberInvitation, acceptMemberInvitation } from "@/modules/members/invitation.service";
import { hashMemberInvitationToken } from "@/modules/members/invitation-token";
import { inviteMemberSchema } from "@/modules/members/schemas";
import { invitationReturnPath } from "@/shared/auth/invitation-return";
import { requireSameOrigin } from "@/shared/http/same-origin";

const token = "a".repeat(43);
const chain = (value: unknown) => ({ exec: async () => value, select() { return this; }, session() { return this; }, then(resolve: (value: unknown) => unknown) { return Promise.resolve(value).then(resolve); } });

describe("member invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MEMBER_INVITATION_SECRET", "test-secret-with-more-than-32-bytes-long");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    mocks.memberFind.mockReturnValue(chain({ weddingId: "wedding-1" }));
    mocks.weddingFind.mockReturnValue(chain({ brideName: "Liya", groomName: "John", weddingDate: "2027-02-14" }));
    mocks.userFind.mockReturnValue(chain(null));
    mocks.memberExists.mockReturnValue(chain(null));
    mocks.weddingExists.mockReturnValue(chain(true));
    mocks.inviteFind.mockReturnValue(chain({ _id: "invite-1", weddingId: "wedding-1", emailNormalized: "john@example.com", role: "MANAGER" }));
    mocks.inviteCreate.mockResolvedValue({ _id: "invite-1", expiresAt: new Date() });
    mocks.inviteUpdate.mockResolvedValue({ modifiedCount: 1 });
    mocks.inviteUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    mocks.memberCreate.mockResolvedValue([]);
    mocks.send.mockResolvedValue(undefined);
  });

  it("normalizes and validates manager invitations", () => {
    expect(inviteMemberSchema.parse({ email: " JOHN@EXAMPLE.COM ", role: "MANAGER" }).email).toBe("john@example.com");
    expect(() => inviteMemberSchema.parse({ email: "bad", role: "ADMIN" })).toThrow();
    expect(() => inviteMemberSchema.parse({ email: "john@example.com", role: "SUPERADMIN" })).toThrow();
    expect(inviteMemberSchema.parse({ email: "john@example.com", role: "EVENT_COORDINATOR" }).role).toBe("EVENT_COORDINATOR");
  });
  it("only allows a validated local invitation return path", () => {
    expect(invitationReturnPath(`/member-invitations/${token}`)).toBe(`/member-invitations/${token}`);
    expect(invitationReturnPath("//evil.example")).toBeUndefined();
    expect(invitationReturnPath(`/member-invitations/${token}?next=https://evil.example`)).toBeUndefined();
  });
  it("requires a trusted origin for mutation", () => {
    expect(() => requireSameOrigin(new Request("http://localhost:3000/api", { headers: { origin: "http://localhost:3000" } }))).not.toThrow();
    expect(() => requireSameOrigin(new Request("http://localhost:3000/api", { headers: { origin: "https://evil.example" } }))).toThrow();
    expect(() => requireSameOrigin(new Request("http://localhost:3000/api"))).toThrow();
  });
  it("hashes tokens with a configured secret", () => {
    expect(hashMemberInvitationToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashMemberInvitationToken(token)).not.toContain(token);
    vi.stubEnv("MEMBER_INVITATION_SECRET", "");
    expect(() => hashMemberInvitationToken(token)).toThrow();
  });
  it("lets an admin send a hashed expiring invitation", async () => {
    const result = await inviteMember("admin-1", " JOHN@EXAMPLE.COM ", "MANAGER");
    expect(result).toMatchObject({ email: "john@example.com", role: "MANAGER", status: "PENDING" });
    expect(mocks.inviteCreate).toHaveBeenCalledWith(expect.objectContaining({ weddingId: "wedding-1", tokenHash: hashMemberInvitationToken(token), emailNormalized: "john@example.com", expiresAt: expect.any(Date) }));
    expect(mocks.send).toHaveBeenCalledWith("john@example.com", token);
  });
  it("does not allow managers to invite", async () => {
    mocks.memberFind.mockReturnValue(chain(null));
    await expect(inviteMember("manager-1", "john@example.com", "MANAGER")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.memberFind).toHaveBeenCalledWith({ userId: "manager-1", role: "ADMIN" });
  });
  it("rejects duplicate pending invitations", async () => {
    mocks.inviteCreate.mockRejectedValue({ code: 11000 });
    await expect(inviteMember("admin-1", "john@example.com", "MANAGER")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("revokes the invitation when email delivery fails", async () => {
    mocks.send.mockRejectedValue(new Error("delivery failed"));
    await expect(inviteMember("admin-1", "john@example.com", "MANAGER")).rejects.toThrow("delivery failed");
    expect(mocks.inviteUpdate).toHaveBeenCalledWith({ _id: "invite-1", status: "PENDING" }, { $set: { status: "REVOKED" } });
  });
  it("hides invalid or expired invitations", async () => {
    mocks.inviteFind.mockReturnValue(chain(null));
    await expect(getMemberInvitation(token)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getMemberInvitation("bad-token")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("returns limited invitation details", async () => {
    expect(await getMemberInvitation(token)).toMatchObject({ email: "john@example.com", wedding: { brideName: "Liya", groomName: "John" } });
    expect(mocks.inviteFind).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING", expiresAt: { $gt: expect.any(Date) } }));
  });
  it("accepts the matching account atomically", async () => {
    await expect(acceptMemberInvitation(token, { id: "user-1", email: "JOHN@example.com" })).resolves.toEqual({ weddingId: "wedding-1", role: "MANAGER" });
    expect(mocks.memberCreate).toHaveBeenCalledWith([expect.objectContaining({ userId: "user-1", weddingId: "wedding-1", role: "MANAGER" })], expect.objectContaining({ session: expect.any(Object) }));
    expect(mocks.inviteUpdate).toHaveBeenCalledWith(expect.objectContaining({ _id: "invite-1", status: "PENDING" }), expect.objectContaining({ $set: expect.objectContaining({ status: "ACCEPTED" }) }), expect.any(Object));
    expect(mocks.end).toHaveBeenCalled();
  });
  it.each(["ADMIN", "EVENT_COORDINATOR"] as const)("invites and accepts the selected %s role", async (role) => {
    await expect(inviteMember("admin-1", "john@example.com", role)).resolves.toMatchObject({ role });
    expect(mocks.inviteCreate).toHaveBeenCalledWith(expect.objectContaining({ role, weddingId: "wedding-1" }));
    mocks.inviteFind.mockReturnValue(chain({ _id: "invite-1", weddingId: "wedding-1", emailNormalized: "john@example.com", role }));
    await expect(acceptMemberInvitation(token, { id: "user-1", email: "john@example.com" })).resolves.toEqual({ weddingId: "wedding-1", role });
    expect(mocks.memberCreate).toHaveBeenCalledWith([expect.objectContaining({ role })], expect.any(Object));
  });
  it("rejects an unknown stored invitation role", async () => {
    mocks.inviteFind.mockReturnValue(chain({ _id: "invite-1", weddingId: "wedding-1", emailNormalized: "john@example.com", role: "SUPERADMIN" }));
    await expect(acceptMemberInvitation(token, { id: "user-1", email: "john@example.com" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.memberCreate).not.toHaveBeenCalled();
  });
  it("rejects a different email or an account with a wedding", async () => {
    await expect(acceptMemberInvitation(token, { id: "user-1", email: "other@example.com" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    mocks.memberExists.mockReturnValue(chain(true));
    await expect(acceptMemberInvitation(token, { id: "user-1", email: "john@example.com" })).rejects.toMatchObject({ code: "ALREADY_HAS_WEDDING" });
    expect(mocks.memberCreate).not.toHaveBeenCalled();
  });
});
