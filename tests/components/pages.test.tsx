import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOptionalCurrentUser: vi.fn(),
  listWeddingMembers: vi.fn(),
  listPendingMemberInvitations: vi.fn(),
  listEvents: vi.fn(),
  listGuests: vi.fn(),
  expenseSummary: vi.fn(),
  vendorSummary: vi.fn(),
  getPublicWeddingWebsite: vi.fn(),
  getGuestInvitation: vi.fn(),
  getMemberInvitation: vi.fn(),
  redirect: vi.fn(),
  router: { refresh: vi.fn(), replace: vi.fn() },
}));

vi.mock("@/server/auth/current-user", () => ({
  getOptionalCurrentUser: mocks.getOptionalCurrentUser,
}));
vi.mock("@/modules/members/member-directory.service", () => ({
  listWeddingMembers: mocks.listWeddingMembers,
  listPendingMemberInvitations: mocks.listPendingMemberInvitations,
}));
vi.mock("@/modules/events/event.service", () => ({ listEvents: mocks.listEvents, upcomingEventsOnly: (events: unknown[]) => events }));
vi.mock("@/modules/guests/guest.service", () => ({ listGuests: mocks.listGuests }));
vi.mock("@/modules/expenses/expense.service", () => ({ expenseSummary: mocks.expenseSummary }));
vi.mock("@/modules/vendors/vendor.service", () => ({ vendorSummary: mocks.vendorSummary }));
vi.mock("@/modules/weddings/website.service", () => ({ getPublicWeddingWebsite: mocks.getPublicWeddingWebsite }));
vi.mock("@/modules/guests/invitation.service", () => ({ getInvitation: mocks.getGuestInvitation }));
vi.mock("@/modules/members/invitation.service", () => ({ getMemberInvitation: mocks.getMemberInvitation }));
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
    mocks.listWeddingMembers.mockReset().mockResolvedValue([]);
    mocks.listPendingMemberInvitations.mockReset().mockResolvedValue([]);
    mocks.listEvents.mockReset().mockResolvedValue([]);
    mocks.listGuests.mockReset().mockResolvedValue({ summary: { total: 0, capacity: 0 } });
    mocks.expenseSummary.mockReset().mockResolvedValue({ totalExpensePaise: 0, count: 0 });
    mocks.vendorSummary.mockReset().mockResolvedValue({ count: 0, categoryCount: 0 });
    mocks.getPublicWeddingWebsite.mockReset().mockResolvedValue({ brideName: "Liya", groomName: "John", title: "Liya & John", description: "", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", location: "Kochi", theme: "MINIMAL_ELEGANT", welcomeMessage: "", gallery: { enabled: false }, livestream: { enabled: false, youtubeUrl: null }, events: [] });
    mocks.getGuestInvitation.mockReset().mockRejectedValue(new AppError("NOT_FOUND", "Unavailable", 404));
    mocks.getMemberInvitation.mockReset().mockResolvedValue({ email: "invited@example.com" });
    mocks.redirect.mockReset();
    mocks.router.refresh.mockReset();
    mocks.router.replace.mockReset();
  });

  it("renders the public shell, landing page, and public website experience", async () => {
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
    expect(screen.getByRole("heading", { name: "Invitation unavailable" })).toBeVisible();
    render(await WeddingWebsitePage({ params: Promise.resolve({ slug: "liya-and-john" }) }));
    expect(screen.getByRole("heading", { name: "Liya & John" })).toBeVisible();
    expect(mocks.getPublicWeddingWebsite).toHaveBeenCalledWith("liya-and-john");
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
    const login = render(await LoginPage());
    expect(screen.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    const editorialImage = login.container.querySelector('img[alt=""]');
    expect(editorialImage).toHaveAttribute("src", expect.stringContaining("login-kasavu-editorial.png"));
    expect(editorialImage?.closest('[aria-hidden="true"]')).toBeInTheDocument();
    const signup = render(await SignupPage());
    expect(screen.getByRole("heading", { name: "Create your space." })).toBeVisible();
    const signupImage = signup.container.querySelector('img[alt=""]');
    expect(signupImage).toHaveAttribute("src", expect.stringContaining("login-kasavu-editorial.png"));
    expect(signupImage?.closest('[aria-hidden="true"]')).toBeInTheDocument();

    mocks.getOptionalCurrentUser.mockResolvedValue({ user: { id: "user-1" } });
    await expectRedirect(LoginPage, "/dashboard");
    await expectRedirect(SignupPage, "/dashboard");
  });

  it("uses the same branded header on sign-in and sign-up while preserving invitation links", async () => {
    mocks.getOptionalCurrentUser.mockResolvedValue(null);
    const next = `/member-invitations/${"a".repeat(43)}`;
    const login = render(await LoginPage({ searchParams: Promise.resolve({ next }) }));
    expect(screen.getByLabelText("Couple space email")).toHaveValue("invited@example.com");
    let header = within(screen.getByRole("banner"));
    expect(header.getByRole("link", { name: "Our Big Day home" })).toHaveAttribute("href", "/");
    expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute("aria-current", "page");
    expect(header.getByRole("link", { name: /start planning/i })).toHaveAttribute("href", `/signup?next=${encodeURIComponent(next)}`);
    login.unmount();

    render(await SignupPage({ searchParams: Promise.resolve({ next }) }));
    expect(screen.getByLabelText("Couple space email")).toHaveValue("invited@example.com");
    header = within(screen.getByRole("banner"));
    expect(header.getByRole("link", { name: "Our Big Day home" })).toHaveAttribute("href", "/");
    expect(header.getByRole("link", { name: /start planning/i })).toHaveAttribute("aria-current", "page");
    expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", `/login?next=${encodeURIComponent(next)}`);
  });

  it("does not prefill authentication forms from invalid or unavailable invitations", async () => {
    mocks.getOptionalCurrentUser.mockResolvedValue(null);
    const login = render(await LoginPage({ searchParams: Promise.resolve({ next: "//example.com" }) }));
    expect(screen.getByLabelText("Couple space email")).toHaveValue("");
    expect(mocks.getMemberInvitation).not.toHaveBeenCalled();
    login.unmount();
    mocks.getMemberInvitation.mockRejectedValue(new AppError("NOT_FOUND", "Unavailable", 404));
    render(await SignupPage({ searchParams: Promise.resolve({ next: `/member-invitations/${"a".repeat(43)}` }) }));
    expect(screen.getByLabelText("Couple space email")).toHaveValue("");
  });

  it("protects dashboard states and renders the member dashboard", async () => {
    mocks.getOptionalCurrentUser.mockResolvedValue(null);
    await expectRedirect(DashboardPage, "/login");

    mocks.getOptionalCurrentUser.mockResolvedValue({ user: { name: "Liya John" }, wedding: null });
    await expectRedirect(DashboardPage, "/onboarding");

    mocks.getOptionalCurrentUser.mockResolvedValue({
      user: { id: "user-1", name: "  Liya John  " },
      membership: { role: "ADMIN" },
      wedding: { brideName: "Liya", groomName: "John", weddingDate: "2027-02-14" },
    });
    mocks.listPendingMemberInvitations.mockResolvedValue([{ id: "invitation-1" }]);
    render(await DashboardPage());
    expect(screen.getByRole("heading", { name: "Welcome back, Liya." })).toBeVisible();
    expect(screen.getByText("Liya & John")).toBeVisible();
    expect(screen.getByText("February 14, 2027")).toBeVisible();
    expect(mocks.listWeddingMembers).toHaveBeenCalledWith("user-1");
    expect(mocks.listPendingMemberInvitations).toHaveBeenCalledWith("user-1");
    expect(screen.getByText("1 pending invitation")).toBeVisible();
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", { name: "Wedding events" })).toHaveAttribute("href", "/dashboard/events");
    expect(footer.getByRole("link", { name: "Wedding members" })).toHaveAttribute("href", "/dashboard/members");
    expect(footer.getByRole("link", { name: "Wedding website" })).toHaveAttribute("href", "/dashboard/website");

    mocks.getOptionalCurrentUser.mockResolvedValue({
      user: { id: "user-1", name: "   " },
      membership: { role: "ADMIN" },
      wedding: { brideName: "Liya", groomName: "John", weddingDate: "2027-02-14" },
    });
    render(await DashboardPage());
    expect(screen.getByRole("heading", { name: "Welcome back, there." })).toBeVisible();
  });

  it("shows managers the member summary but never queries pending invitations", async () => {
    mocks.getOptionalCurrentUser.mockResolvedValue({
      user: { id: "manager-1", name: "Morgan" }, membership: { role: "MANAGER" },
      wedding: { brideName: "Liya", groomName: "John", weddingDate: "2027-02-14" },
    });
    mocks.listWeddingMembers.mockResolvedValue([{ membershipId: "m1", user: { id: "manager-1", name: "Morgan" }, role: "MANAGER" }]);
    render(await DashboardPage());
    expect(screen.getByText("Morgan (You)")).toBeVisible();
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute("href", "/dashboard/members");
    expect(mocks.listPendingMemberInvitations).not.toHaveBeenCalled();
    expect(screen.queryByText(/pending invitations/i)).not.toBeInTheDocument();
  });

  it("limits coordinators to their assigned-event placeholder without fetching member data", async () => {
    mocks.getOptionalCurrentUser.mockResolvedValue({
      user: { id: "coordinator-1", name: "Casey" }, membership: { role: "EVENT_COORDINATOR" },
      wedding: { brideName: "Liya", groomName: "John", weddingDate: "2027-02-14" },
    });
    render(await DashboardPage());
    expect(screen.getByRole("heading", { name: "Your assigned events" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Wedding members" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Wedding members" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Wedding website" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: "Wedding events" })).toHaveAttribute("href", "/dashboard/events");
    expect(mocks.listWeddingMembers).not.toHaveBeenCalled();
    expect(mocks.listPendingMemberInvitations).not.toHaveBeenCalled();
    expect(mocks.expenseSummary).not.toHaveBeenCalled();
    expect(mocks.vendorSummary).not.toHaveBeenCalled();
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
