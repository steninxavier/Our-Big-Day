import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOptionalCurrentUser: vi.fn(),
  redirect: vi.fn(),
  router: { refresh: vi.fn(), replace: vi.fn() },
}));

vi.mock("@/server/auth/current-user", () => ({
  getOptionalCurrentUser: mocks.getOptionalCurrentUser,
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => mocks.router,
}));
vi.mock("next/font/google", () => ({
  Playfair_Display: () => ({ variable: "playfair" }),
  Plus_Jakarta_Sans: () => ({ variable: "jakarta" }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

import LoginPage from "@/app/(auth)/login/page";
import SignupPage from "@/app/(auth)/signup/page";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import OnboardingPage from "@/app/(onboarding)/onboarding/page";
import GalleryPage from "@/app/gallery/[token]/page";
import RootLayout from "@/app/layout";
import HomePage from "@/app/page";
import InvitationPage from "@/app/invite/[token]/page";
import WeddingWebsitePage from "@/app/w/[slug]/page";
import { AppError } from "@/shared/errors/app-error";

const redirectSignal = new Error("redirect");

async function expectRedirect(page: () => Promise<unknown>, destination: string) {
  mocks.redirect.mockImplementation(() => {
    throw redirectSignal;
  });

  await expect(page()).rejects.toBe(redirectSignal);
  expect(mocks.redirect).toHaveBeenCalledWith(destination);
}

describe("application pages", () => {
  beforeEach(() => {
    mocks.getOptionalCurrentUser.mockReset();
    mocks.redirect.mockReset();
    mocks.router.refresh.mockReset();
    mocks.router.replace.mockReset();
  });

  it("renders the public shell, landing page, and placeholder link experiences", async () => {
    render(RootLayout({ children: <p>Child content</p> }));
    expect(screen.getByText("Child content")).toBeVisible();

    mocks.getOptionalCurrentUser.mockResolvedValue(null);
    render(await HomePage());
    expect(screen.getByRole("heading", { name: /plan together/i })).toBeVisible();
    expect(screen.getAllByRole("link", { name: /start planning/i })).toHaveLength(3);
    const navigation = within(screen.getByRole("navigation", { name: "Primary navigation" }));
    expect(navigation.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(navigation.getByRole("link", { name: "Start planning" })).toHaveAttribute("href", "/signup");
    expect(screen.getByText("Event choreography")).toBeVisible();
    expect(screen.getByText("Shared financials")).toBeVisible();
    expect(screen.getByText("Private photo vault")).toBeVisible();

    render(await GalleryPage({ params: Promise.resolve({ token: "gallery-token" }) }));
    expect(screen.getByRole("heading", { name: "Wedding gallery" })).toBeVisible();
    render(await InvitationPage({ params: Promise.resolve({ token: "invite-token" }) }));
    expect(screen.getByRole("heading", { name: "You're invited" })).toBeVisible();
    render(await WeddingWebsitePage({ params: Promise.resolve({ slug: "liya-and-john" }) }));
    expect(screen.getByRole("heading", { name: "liya-and-john" })).toBeVisible();
  });

  it("shows the wedding dashboard in the header for a signed-in member", async () => {
    mocks.getOptionalCurrentUser.mockResolvedValue({ user: { id: "user-1" }, wedding: { id: "wedding-1" } });
    render(await HomePage());

    const navigation = within(screen.getByRole("navigation", { name: "Primary navigation" }));
    expect(navigation.getByRole("link", { name: "Go to wedding" })).toHaveAttribute("href", "/dashboard");
    expect(navigation.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(navigation.queryByRole("link", { name: "Start planning" })).not.toBeInTheDocument();
  });

  it("shows wedding setup in the header for a signed-in user without a wedding", async () => {
    mocks.getOptionalCurrentUser.mockResolvedValue({ user: { id: "user-1" }, wedding: null });
    render(await HomePage());

    const navigation = within(screen.getByRole("navigation", { name: "Primary navigation" }));
    expect(navigation.getByRole("link", { name: "Complete wedding setup" })).toHaveAttribute("href", "/onboarding");
    expect(navigation.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(navigation.queryByRole("link", { name: "Start planning" })).not.toBeInTheDocument();
  });

  it("keeps the public homepage available if the database is temporarily unavailable", async () => {
    mocks.getOptionalCurrentUser.mockRejectedValue(new AppError("SERVICE_UNAVAILABLE", "Unavailable", 503));
    render(await HomePage());

    const navigation = within(screen.getByRole("navigation", { name: "Primary navigation" }));
    expect(navigation.getByRole("link", { name: "Your account" })).toHaveAttribute("href", "/dashboard");
    expect(navigation.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("does not hide unexpected homepage session errors", async () => {
    const error = new Error("Unexpected session failure");
    mocks.getOptionalCurrentUser.mockRejectedValue(error);
    await expect(HomePage()).rejects.toBe(error);
  });

  it("renders anonymous authentication pages and redirects authenticated visitors", async () => {
    mocks.getOptionalCurrentUser.mockResolvedValue(null);
    render(await LoginPage());
    expect(screen.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    render(await SignupPage());
    expect(screen.getByRole("heading", { name: "Create your space." })).toBeVisible();

    mocks.getOptionalCurrentUser.mockResolvedValue({ user: { id: "user-1" } });
    await expectRedirect(LoginPage, "/dashboard");
    await expectRedirect(SignupPage, "/dashboard");
  });

  it("protects dashboard states and renders the member dashboard", async () => {
    mocks.getOptionalCurrentUser.mockResolvedValue(null);
    await expectRedirect(DashboardPage, "/login");

    mocks.getOptionalCurrentUser.mockResolvedValue({ user: { name: "Liya John" }, wedding: null });
    await expectRedirect(DashboardPage, "/onboarding");

    mocks.getOptionalCurrentUser.mockResolvedValue({
      user: { name: "  Liya John  " },
      wedding: { brideName: "Liya", groomName: "John", weddingDate: "2027-02-14" },
    });
    render(await DashboardPage());
    expect(screen.getByRole("heading", { name: "Welcome, Liya." })).toBeVisible();
    expect(screen.getByText("Liya & John · 2027-02-14")).toBeVisible();

    mocks.getOptionalCurrentUser.mockResolvedValue({
      user: { name: "   " },
      wedding: { brideName: "Liya", groomName: "John", weddingDate: "2027-02-14" },
    });
    render(await DashboardPage());
    expect(screen.getByRole("heading", { name: "Welcome, there." })).toBeVisible();
  });

  it("protects onboarding and renders it only for signed-in users without a wedding", async () => {
    mocks.getOptionalCurrentUser.mockResolvedValue(null);
    await expectRedirect(OnboardingPage, "/login");

    mocks.getOptionalCurrentUser.mockResolvedValue({ user: { name: "Liya" }, wedding: { id: "wedding-1" } });
    await expectRedirect(OnboardingPage, "/dashboard");

    mocks.getOptionalCurrentUser.mockResolvedValue({ user: { name: "Liya" }, wedding: null });
    render(await OnboardingPage());
    expect(screen.getByRole("heading", { name: "Tell us about your celebration." })).toBeVisible();
    expect(screen.getByText("Welcome, Liya.")).toBeVisible();
  });
});
