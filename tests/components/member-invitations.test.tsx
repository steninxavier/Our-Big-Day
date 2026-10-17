import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import InviteMemberForm from "@/app/(dashboard)/dashboard/invite-member-form";
import AcceptButton from "@/app/member-invitations/[token]/accept-button";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("member invitation controls", () => {
  it("validates an email before sending", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<InviteMemberForm />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email address");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sends the manager invitation and confirms delivery", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<InviteMemberForm />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "john@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Invitation sent");
    expect(fetchMock).toHaveBeenCalledWith("/api/members/invitations", expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "john@example.com", role: "MANAGER" }) }));
  });
  it("shows a delivery error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Email unavailable" } }) }));
    render(<InviteMemberForm />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "john@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email unavailable");
  });
  it("sends the selected coordinator role", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<InviteMemberForm />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "EVENT_COORDINATOR" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Event Coordinator");
    expect(fetchMock).toHaveBeenCalledWith("/api/members/invitations", expect.objectContaining({ body: JSON.stringify({ email: "john@example.com", role: "EVENT_COORDINATOR" }) }));
  });
  it("joins the wedding after a successful acceptance", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) }));
    render(<AcceptButton token={"a".repeat(43)} />);
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
  });
  it("shows a rejected acceptance", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Invitation expired" } }) }));
    render(<AcceptButton token={"a".repeat(43)} />);
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invitation expired");
    expect(router.replace).not.toHaveBeenCalled();
  });
});
