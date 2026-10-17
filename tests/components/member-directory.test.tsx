import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ current: vi.fn(), members: vi.fn(), invitations: vi.fn(), redirect: vi.fn(), router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("@/server/auth/current-user", () => ({ getOptionalCurrentUser: mocks.current }));
vi.mock("@/modules/members/member-directory.service", () => ({ listWeddingMembers: mocks.members, listPendingMemberInvitations: mocks.invitations }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, useRouter: () => mocks.router }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
import MembersPage from "@/app/(dashboard)/dashboard/members/page";

describe("wedding members page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.current.mockResolvedValue({ user: { id: "user-1", name: "Liya", email: "liya@example.com" }, membership: { role: "ADMIN" }, wedding: { brideName: "Liya", groomName: "John" } });
    mocks.members.mockResolvedValue([{ membershipId: "m-1", user: { id: "user-1", name: "Liya", email: "liya@example.com" }, role: "ADMIN", joinedAt: "2026-01-01T00:00:00.000Z" }]);
    mocks.invitations.mockResolvedValue([{ id: "i-1", email: "john@example.com", role: "MANAGER", expiresAt: "2030-01-01T00:00:00.000Z" }]);
  });
  it("shows the current admin, navigation, and pending invitations", async () => {
    render(await MembersPage());
    expect(screen.getByRole("link", { name: "Wedding members" })).toHaveAttribute("aria-current", "page");
    const members = within(screen.getByRole("region", { name: "Your members" }));
    expect(members.getByText("Liya")).toBeVisible();
    expect(members.getByText("You")).toBeVisible();
    expect(members.getByText("Admin")).toBeVisible();
    expect(screen.getByText("john@example.com")).toBeVisible();
    expect(screen.getByRole("button", { name: "Send invitation" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Remove Liya" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Revoke john@example.com" })).toBeVisible();
  });
  it("does not show invitations or the invite form to a manager", async () => {
    mocks.current.mockResolvedValue({ user: { id: "user-1", name: "Liya" }, membership: { role: "MANAGER" }, wedding: { brideName: "Liya", groomName: "John" } });
    mocks.members.mockResolvedValue([{ membershipId: "m-1", user: { id: "user-1", name: "Liya", email: "liya@example.com" }, role: "MANAGER", joinedAt: "2026-01-01T00:00:00.000Z" }]);
    render(await MembersPage());
    expect(screen.getByText("Manager")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Pending invitations" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send invitation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Liya" })).not.toBeInTheDocument();
    expect(mocks.invitations).not.toHaveBeenCalled();
  });
  it("shows a clear empty state for pending invitations", async () => {
    mocks.invitations.mockResolvedValue([]);
    render(await MembersPage());
    expect(screen.getByText(/No pending invitations yet/)).toBeVisible();
  });
  it("redirects coordinators before loading the directory", async () => {
    mocks.current.mockResolvedValue({ user: { id: "user-1" }, membership: { role: "EVENT_COORDINATOR" }, wedding: { brideName: "Liya", groomName: "John" } });
    mocks.redirect.mockImplementationOnce(() => { throw new Error("redirect"); });
    await expect(MembersPage()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
    expect(mocks.members).not.toHaveBeenCalled();
    expect(mocks.invitations).not.toHaveBeenCalled();
  });
});
