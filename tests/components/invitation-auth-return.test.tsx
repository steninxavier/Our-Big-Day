import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import LoginForm from "@/app/(auth)/login/login-form";
import SignupForm from "@/app/(auth)/signup/signup-form";

const next = `/member-invitations/${"a".repeat(43)}`;
describe("invitation authentication return paths", () => {
  it("returns a newly created account to the invitation instead of onboarding", async () => {
    router.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { hasWedding: false } }) }));
    render(<SignupForm next={next} initialEmail="qa@example.invalid" />);
    expect(screen.getByLabelText("Couple space email")).toHaveValue("qa@example.invalid");
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "QA Member" } });
    fireEvent.change(screen.getByLabelText("Create a password"), { target: { value: "password1" } });
    fireEvent.change(screen.getByLabelText("Confirm your password"), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: /create your wedding space/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(next));
  });
  it("returns an existing account to the invitation after sign-in", async () => {
    router.replace.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { hasWedding: false } }) }));
    render(<LoginForm next={next} initialEmail="qa@example.invalid" />);
    expect(screen.getByLabelText("Couple space email")).toHaveValue("qa@example.invalid");
    fireEvent.change(screen.getByLabelText("Couple space email"), { target: { value: "edited@example.invalid" } });
    expect(screen.getByLabelText("Couple space email")).toHaveValue("edited@example.invalid");
    fireEvent.change(screen.getByLabelText("Private key"), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in to wedding space/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(next));
  });
});
