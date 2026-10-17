import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), cookie: vi.fn(), listMembers: vi.fn(), listInvitations: vi.fn() }));
vi.mock("@/modules/auth/auth.service", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/auth/session-cookie", () => ({ getSessionTokenFromCookie: mocks.cookie }));
vi.mock("@/modules/members/member-directory.service", () => ({ listWeddingMembers: mocks.listMembers, listPendingMemberInvitations: mocks.listInvitations }));
vi.mock("@/modules/members/invitation.service", () => ({ inviteMember: vi.fn() }));
import { GET as getMembers } from "@/app/api/members/route";
import { GET as getInvitations } from "@/app/api/members/invitations/route";
import { AppError } from "@/shared/errors/app-error";

describe("member directory routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookie.mockResolvedValue("session-token");
    mocks.getCurrentUser.mockResolvedValue({ user: { id: "user-1" } });
    mocks.listMembers.mockResolvedValue([{ role: "ADMIN" }]);
    mocks.listInvitations.mockResolvedValue([]);
  });
  it("resolves the member list from the session user", async () => {
    const response = await getMembers();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.listMembers).toHaveBeenCalledWith("user-1");
  });
  it("returns the service's authorization error for a manager", async () => {
    mocks.listInvitations.mockRejectedValue(new AppError("FORBIDDEN", "Admin required.", 403));
    const response = await getInvitations();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: { code: "FORBIDDEN" } });
  });
  it("rejects unauthenticated requests before querying the directory", async () => {
    mocks.getCurrentUser.mockRejectedValue(new AppError("UNAUTHENTICATED", "Sign in.", 401));
    expect((await getMembers()).status).toBe(401);
    expect(mocks.listMembers).not.toHaveBeenCalled();
  });
});
