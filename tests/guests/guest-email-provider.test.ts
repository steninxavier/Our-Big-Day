import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
import { guestEmailConfiguration, sendGuestInvitationEmail } from "@/server/email/guest-invitation";

const message = { email: "guest@example.com", guestName: "Guest", brideName: "Liya", groomName: "John", weddingDate: "2027-02-14", url: "https://example.com/invite/private-token", kind: "invitation" as const };
describe("guest email provider boundary", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "Our Big Day <noreply@example.com>");
    vi.stubEnv("APP_URL", "https://example.com");
    mocks.send.mockReset().mockResolvedValue({ data: { id: "accepted" }, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("creates an invitation with the couple, calendar date and private link", async () => {
    await sendGuestInvitationEmail(message);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: message.email, subject: expect.stringContaining("Liya & John"), text: expect.stringContaining("February 14, 2027") }));
    expect(mocks.send.mock.calls[0][0].text).toContain(message.url);
  });
  it("rejects localhost and non-HTTPS URLs before contacting the provider", async () => {
    vi.stubEnv("APP_URL", "http://localhost:3000");
    expect(() => guestEmailConfiguration()).toThrow(/HTTPS APP_URL/);
    await expect(sendGuestInvitationEmail(message)).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("distinguishes provider rejection from uncertain network failure", async () => {
    mocks.send.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    await expect(sendGuestInvitationEmail(message)).rejects.toThrow(/did not accept/);
    mocks.send.mockRejectedValueOnce(new Error("timeout"));
    await expect(sendGuestInvitationEmail(message)).rejects.toThrow(/may have been sent/);
  });
});
