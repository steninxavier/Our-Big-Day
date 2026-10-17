import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), cookie: vi.fn(), remove: vi.fn(), revoke: vi.fn() }));
vi.mock("@/modules/auth/auth.service", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/auth/session-cookie", () => ({ getSessionTokenFromCookie: mocks.cookie }));
vi.mock("@/modules/members/member-management.service", () => ({ removeWeddingMember: mocks.remove, revokeMemberInvitation: mocks.revoke }));
import { DELETE as remove } from "@/app/api/members/[membershipId]/route";
import { DELETE as revoke } from "@/app/api/members/invitations/[invitationId]/route";
import { AppError } from "@/shared/errors/app-error";

const id = "0123456789abcdef01234567";
const request = (origin = "http://localhost:3000") => new Request("http://localhost:3000/api/members", { method: "DELETE", headers: { origin } });

describe("member management routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_URL", "http://localhost:3000");
    mocks.user.mockResolvedValue({ user: { id: "admin-1" } });
  });
  it("removes a member with the authenticated user", async () => {
    const response = await remove(request(), { params: Promise.resolve({ membershipId: id }) });
    expect(response.status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith("admin-1", id);
  });
  it("revokes an invitation with the authenticated user", async () => {
    const response = await revoke(request(), { params: Promise.resolve({ invitationId: id }) });
    expect(response.status).toBe(200);
    expect(mocks.revoke).toHaveBeenCalledWith("admin-1", id);
  });
  it("rejects cross-origin and invalid IDs", async () => {
    expect((await remove(request("https://example.com"), { params: Promise.resolve({ membershipId: id }) })).status).toBe(403);
    expect((await revoke(request(), { params: Promise.resolve({ invitationId: "not-an-id" }) })).status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.revoke).not.toHaveBeenCalled();
  });
  it("returns last-admin and unauthenticated errors", async () => {
    mocks.remove.mockRejectedValue(new AppError("LAST_ADMIN", "Keep an admin.", 409));
    expect((await remove(request(), { params: Promise.resolve({ membershipId: id }) })).status).toBe(409);
    mocks.user.mockRejectedValue(new AppError("UNAUTHENTICATED", "Sign in.", 401));
    expect((await revoke(request(), { params: Promise.resolve({ invitationId: id }) })).status).toBe(401);
    expect(mocks.revoke).not.toHaveBeenCalled();
  });
});
