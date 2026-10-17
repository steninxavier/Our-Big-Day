import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import buttonStyles from "@/shared/ui/action-button.module.css";

vi.mock("@/modules/members/invitation.service", () => ({
  getMemberInvitation: vi.fn().mockResolvedValue({
    email: "john@example.com",
    role: "MANAGER",
    wedding: { brideName: "Liya", groomName: "John" },
  }),
}));
vi.mock("@/server/auth/current-user", () => ({ getOptionalCurrentUser: vi.fn().mockResolvedValue(null) }));

import MemberInvitationPage from "@/app/member-invitations/[token]/page";

describe("member invitation page", () => {
  it("uses the shared primary button for sign in and preserves the invitation return path", async () => {
    const token = "a".repeat(43);
    render(await MemberInvitationPage({ params: Promise.resolve({ token }) }));

    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveClass(buttonStyles.button);
    expect(signIn).toHaveAttribute("href", `/login?next=${encodeURIComponent(`/member-invitations/${token}`)}`);
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href", `/signup?next=${encodeURIComponent(`/member-invitations/${token}`)}`,
    );
  });
});
