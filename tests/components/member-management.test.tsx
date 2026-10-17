import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MemberAction from "@/app/(dashboard)/dashboard/members/member-action";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("member management controls", () => {
  it("asks for confirmation before removing a member", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<MemberAction kind="member" id="member-1" label="John" />);
    fireEvent.click(screen.getByRole("button", { name: "Remove John" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("John will lose access to this wedding.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/members/member-1", { method: "DELETE" });
  });
  it("cancels revocation without a request", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<MemberAction kind="invitation" id="invite-1" label="john@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Revoke john@example.com" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("revokes an invitation after confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<MemberAction kind="invitation" id="invite-1" label="john@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "Revoke john@example.com" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm revoke" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/members/invitations/invite-1", { method: "DELETE" });
  });
  it("shows a last-admin error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "A wedding must have at least one admin." } }) }));
    render(<MemberAction kind="member" id="member-1" label="Liya" self />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Liya" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least one admin");
    expect(router.replace).not.toHaveBeenCalled();
  });
  it("returns a removed admin to onboarding", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }));
    render(<MemberAction kind="member" id="member-1" label="Liya" self />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Liya" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/onboarding"));
  });
});
