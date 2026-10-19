import { beforeEach, describe, expect, it, vi } from "vitest";
const mockUpdate = vi.hoisted(() => vi.fn());
vi.mock("@/modules/guests/models/rsvp-rate.model", () => ({ RsvpRateModel: { findOneAndUpdate: mockUpdate } }));
import { limitRsvp } from "@/modules/guests/rsvp-rate";

describe("RSVP rate limits", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("MEMBER_INVITATION_SECRET", "s".repeat(32)); });
  it("uses a keyed invitation identifier and consumes invitation before shared quota", async () => {
    mockUpdate.mockReturnValue({ lean: () => ({ exec: async () => ({ count: 1 }) }) });
    const token = "a".repeat(43);
    await limitRsvp(token);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate.mock.calls[0][0]._id).toMatch(/^guest:[a-f0-9]{64}:/);
    expect(mockUpdate.mock.calls[0][0]._id).not.toContain(token);
    expect(mockUpdate.mock.calls[1][0]._id).toMatch(/^global:/);
  });
  it("does not consume shared quota when the invitation limit is exceeded", async () => {
    mockUpdate.mockReturnValue({ lean: () => ({ exec: async () => ({ count: 21 }) }) });
    await expect(limitRsvp("a".repeat(43))).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
