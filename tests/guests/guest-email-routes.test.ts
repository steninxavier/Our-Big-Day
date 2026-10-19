import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/shared/errors/app-error";

const mocks = vi.hoisted(() => ({ origin: vi.fn(), current: vi.fn(), send: vi.fn() }));
vi.mock("@/shared/http/same-origin", () => ({ requireSameOrigin: mocks.origin }));
vi.mock("@/modules/auth/auth.service", () => ({ getCurrentUser: mocks.current }));
vi.mock("@/server/auth/session-cookie", () => ({ getSessionTokenFromCookie: vi.fn().mockResolvedValue("session") }));
vi.mock("@/modules/guests/guest-email.service", () => ({ sendGuestEmail: mocks.send }));
import { POST as invitation } from "@/app/api/guests/[guestId]/send-invitation/route";
import { POST as reminder } from "@/app/api/guests/[guestId]/send-reminder/route";

describe("guest email API boundaries", () => {
  const guestId = "0123456789abcdef01234567";
  const request = () => new Request("https://example.com", { method: "POST" });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.current.mockResolvedValue({ user: { id: "user" } });
    mocks.send.mockResolvedValue({ acceptedAt: "2026-10-19T12:00:00.000Z" });
  });
  it("checks the origin and authenticated user before sending", async () => {
    mocks.origin.mockImplementationOnce(() => { throw new AppError("FORBIDDEN", "Invalid origin.", 403); });
    const denied = await invitation(request(), { params: Promise.resolve({ guestId }) });
    expect(denied.status).toBe(403);
    expect(mocks.current).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    const accepted = await reminder(request(), { params: Promise.resolve({ guestId }) });
    expect(accepted.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith("user", guestId, "reminder");
    expect(accepted.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects malformed guest identifiers before the service call", async () => {
    const response = await invitation(request(), { params: Promise.resolve({ guestId: "invalid" }) });
    expect(response.status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
