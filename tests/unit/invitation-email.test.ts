import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/shared/errors/app-error";

const getMemberInvitation = vi.hoisted(() => vi.fn());
vi.mock("@/modules/members/invitation.service", () => ({ getMemberInvitation }));
import { getInvitationEmailForReturn } from "@/server/auth/invitation-email";

describe("invitation email prefill", () => {
  const token = "a".repeat(43);
  beforeEach(() => { getMemberInvitation.mockReset(); });

  it("resolves the invited email from a valid invitation token", async () => {
    getMemberInvitation.mockResolvedValue({ email: "invited@example.com" });
    await expect(getInvitationEmailForReturn(`/member-invitations/${token}`)).resolves.toBe("invited@example.com");
    expect(getMemberInvitation).toHaveBeenCalledWith(token);
  });
  it("ignores missing, malformed, and external return paths", async () => {
    for (const value of [undefined, "//example.com", "/member-invitations/bad", `/member-invitations/${token}?email=other@example.com`]) {
      await expect(getInvitationEmailForReturn(value)).resolves.toBeUndefined();
    }
    expect(getMemberInvitation).not.toHaveBeenCalled();
  });
  it("does not prefill an expired, revoked, or unavailable invitation", async () => {
    getMemberInvitation.mockRejectedValue(new AppError("NOT_FOUND", "Unavailable", 404));
    await expect(getInvitationEmailForReturn(`/member-invitations/${token}`)).resolves.toBeUndefined();
  });
  it("does not hide unexpected database failures", async () => {
    const failure = new Error("database unavailable");
    getMemberInvitation.mockRejectedValue(failure);
    await expect(getInvitationEmailForReturn(`/member-invitations/${token}`)).rejects.toBe(failure);
  });
});
