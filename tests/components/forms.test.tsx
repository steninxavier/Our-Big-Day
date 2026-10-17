import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

import LoginForm from "@/app/(auth)/login/login-form";
import LogoutButton from "@/app/(dashboard)/dashboard/logout-button";
import WeddingOnboardingForm from "@/app/(onboarding)/onboarding/wedding-onboarding-form";
import SignupForm from "@/app/(auth)/signup/signup-form";

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: vi.fn().mockResolvedValue(body) };
}

describe("login form", () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it("shows accessible validation feedback and toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: /sign in to wedding space/i }));
    expect(screen.getByText("Enter your email address.")).toBeVisible();
    expect(screen.getByText("Enter your password.")).toBeVisible();

    const password = screen.getByLabelText("Private key");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");

    await user.type(screen.getByLabelText("Couple space email"), "invalid");
    fireEvent.blur(screen.getByLabelText("Couple space email"));
    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    await user.clear(password);
    fireEvent.change(password, { target: { value: "😀".repeat(19) } });
    fireEvent.blur(password);
    expect(screen.getByText("Use 72 UTF-8 bytes or fewer.")).toBeVisible();

  });

  it("submits normalized input and routes according to wedding membership", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(response({ data: { hasWedding: true } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Couple space email"), " LIYA@EXAMPLE.COM ");
    await user.type(screen.getByLabelText("Private key"), "password1");
    await user.click(screen.getByRole("button", { name: /sign in to wedding space/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
    expect(router.refresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ body: JSON.stringify({ email: "LIYA@EXAMPLE.COM", password: "password1" }) }));
  });

  it("routes new couples to onboarding and shows server, fallback, and network failures", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Couple space email"), "liya@example.com");
    await user.type(screen.getByLabelText("Private key"), "password1");

    fetchMock.mockResolvedValueOnce(response({ data: { hasWedding: false } }));
    await user.click(screen.getByRole("button", { name: /sign in to wedding space/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/onboarding"));

    fetchMock.mockResolvedValueOnce(response({ error: { message: "Invalid email or password." } }, false, 401));
    await user.click(screen.getByRole("button", { name: /sign in to wedding space/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: vi.fn().mockRejectedValue(new Error("not json")) });
    await user.click(screen.getByRole("button", { name: /sign in to wedding space/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not sign you in.");

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await user.click(screen.getByRole("button", { name: /sign in to wedding space/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not reach your wedding space.");
  });
});

describe("signup form", () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it("validates every field and keeps confirmation synchronized with password changes", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);
    await user.click(screen.getByRole("button", { name: /create your wedding space/i }));
    expect(screen.getByText("Enter your name.")).toBeVisible();
    expect(screen.getByText("Enter your email address.")).toBeVisible();
    expect(screen.getByText("Create a password.")).toBeVisible();
    expect(screen.getByText("Confirm your password.")).toBeVisible();

    const password = screen.getByLabelText("Create a password");
    const confirmation = screen.getByLabelText("Confirm your password");
    await user.type(password, "password1");
    await user.type(confirmation, "different1");
    fireEvent.blur(confirmation);
    expect(screen.getByText("Passwords do not match.")).toBeVisible();
    await user.clear(password);
    fireEvent.change(password, { target: { value: "😀".repeat(19) } });
    fireEvent.blur(password);
    expect(screen.getByText("Use 72 UTF-8 bytes or fewer.")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "L".repeat(121) } });
    fireEvent.blur(screen.getByLabelText("Your name"));
    expect(screen.getByText("Use 120 characters or fewer.")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Couple space email"), { target: { value: "not-an-email" } });
    fireEvent.blur(screen.getByLabelText("Couple space email"));
    expect(screen.getByText("Enter a valid email address.")).toBeVisible();

    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
  });

  it("submits valid data and handles membership, server, fallback, and network paths", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SignupForm />);
    await user.type(screen.getByLabelText("Your name"), " Liya John ");
    await user.type(screen.getByLabelText("Couple space email"), " LIYA@EXAMPLE.COM ");
    await user.type(screen.getByLabelText("Create a password"), "password1");
    await user.type(screen.getByLabelText("Confirm your password"), "password1");

    fetchMock.mockResolvedValueOnce(response({ data: { hasWedding: false } }, true, 201));
    await user.click(screen.getByRole("button", { name: /create your wedding space/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/onboarding"));
    await waitFor(() => expect(screen.getByRole("button", { name: /create your wedding space/i })).toBeEnabled());
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/signup", expect.objectContaining({ body: JSON.stringify({ name: "Liya John", email: "LIYA@EXAMPLE.COM", password: "password1" }) }));

    fetchMock.mockResolvedValueOnce(response({ data: { hasWedding: true } }));
    await user.click(screen.getByRole("button", { name: /create your wedding space/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
    await waitFor(() => expect(screen.getByRole("button", { name: /create your wedding space/i })).toBeEnabled());

    fetchMock.mockResolvedValueOnce(response({ error: { message: "Email exists." } }, false, 409));
    await user.click(screen.getByRole("button", { name: /create your wedding space/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email exists.");
    await waitFor(() => expect(screen.getByRole("button", { name: /create your wedding space/i })).toBeEnabled());

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: vi.fn().mockRejectedValue(new Error("not json")) });
    await user.click(screen.getByRole("button", { name: /create your wedding space/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not create your account.");
    await waitFor(() => expect(screen.getByRole("button", { name: /create your wedding space/i })).toBeEnabled());

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await user.click(screen.getByRole("button", { name: /create your wedding space/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not reach your wedding space.");
  });
});

describe("wedding onboarding form", () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it("shows errors for all required fields and rejects invalid dates", async () => {
    const user = userEvent.setup();
    render(<WeddingOnboardingForm />);
    await user.click(screen.getByRole("button", { name: /create wedding space/i }));
    expect(screen.getByText("Enter the bride’s name.")).toBeVisible();
    expect(screen.getByText("Enter the groom’s name.")).toBeVisible();
    expect(screen.getByText("Choose the wedding date.")).toBeVisible();
    expect(screen.getByText("Enter the city or wedding location.")).toBeVisible();

    const weddingDate = screen.getByLabelText(/Wedding date/);
    Object.defineProperty(weddingDate, "value", { configurable: true, value: "2027-02-30" });
    fireEvent.change(weddingDate);
    fireEvent.blur(weddingDate);
    expect(screen.getByText("Choose a valid wedding date.")).toBeVisible();

    Object.defineProperty(weddingDate, "value", { configurable: true, value: "not-a-date" });
    fireEvent.change(weddingDate);
    fireEvent.blur(weddingDate);
    expect(screen.getByText("Choose a valid wedding date.")).toBeVisible();
  });

  it("validates upper limits and all optional field error states", () => {
    render(<WeddingOnboardingForm />);

    const brideName = screen.getByLabelText(/Bride’s name/);
    const city = screen.getByLabelText(/City or wedding location/);
    const timeZone = screen.getByLabelText(/Wedding time zone/);
    const title = screen.getByLabelText(/Wedding title/);
    const description = screen.getByLabelText(/A note about your celebration/);

    fireEvent.change(brideName, { target: { value: "L".repeat(121) } });
    fireEvent.blur(brideName);
    fireEvent.change(city, { target: { value: "K".repeat(121) } });
    fireEvent.blur(city);
    Object.defineProperty(timeZone, "value", { configurable: true, value: "" });
    fireEvent.change(timeZone);
    fireEvent.blur(timeZone);
    fireEvent.change(title, { target: { value: "T".repeat(181) } });
    fireEvent.blur(title);
    fireEvent.change(description, { target: { value: "D".repeat(2_001) } });
    fireEvent.blur(description);

    expect(screen.getAllByText("Use 120 characters or fewer.")).toHaveLength(2);
    expect(screen.getByText("Choose the wedding time zone.")).toBeVisible();
    expect(screen.getByText("Use 180 characters or fewer.")).toBeVisible();
    expect(screen.getByText("Use 2,000 characters or fewer.")).toBeVisible();
    expect(title).toHaveAttribute("aria-describedby", "title-error");
    expect(description).toHaveAttribute("aria-describedby", "description-error");
  });

  it("omits empty optional fields from a valid wedding request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(response({ data: { id: "wedding-1" } }, true, 201));
    vi.stubGlobal("fetch", fetchMock);
    render(<WeddingOnboardingForm />);

    await user.type(screen.getByLabelText(/Bride’s name/), "Liya");
    await user.type(screen.getByLabelText(/Groom’s name/), "John");
    fireEvent.change(screen.getByLabelText(/Wedding date/), { target: { value: "2027-02-14" } });
    await user.type(screen.getByLabelText(/City or wedding location/), "Kochi");
    await user.click(screen.getByRole("button", { name: /create wedding space/i }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("title");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("description");
  });

  it("submits trimmed optional data and handles server, fallback, and network failures", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<WeddingOnboardingForm />);
    await user.type(screen.getByLabelText(/Bride’s name/), " Liya ");
    await user.type(screen.getByLabelText(/Groom’s name/), " John ");
    fireEvent.change(screen.getByLabelText(/Wedding date/), { target: { value: "2027-02-14" } });
    await user.type(screen.getByLabelText(/City or wedding location/), " Kochi ");
    await user.selectOptions(screen.getByLabelText(/Wedding time zone/), "Europe/Berlin");
    await user.type(screen.getByLabelText(/Wedding title/), " Liya & John ");
    await user.type(screen.getByLabelText(/A note about your celebration/), " A celebration ");

    fetchMock.mockResolvedValueOnce(response({ data: { id: "wedding-1" } }, true, 201));
    await user.click(screen.getByRole("button", { name: /create wedding space/i }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
    expect(fetchMock).toHaveBeenCalledWith("/api/wedding", expect.objectContaining({ body: JSON.stringify({
      brideName: "Liya", groomName: "John", weddingDate: "2027-02-14", timeZone: "Europe/Berlin",
      location: { city: "Kochi", formattedAddress: "Kochi" }, title: "Liya & John", description: "A celebration",
    }) }));

    fetchMock.mockResolvedValueOnce(response({ error: { message: "Already has wedding." } }, false, 409));
    await user.click(screen.getByRole("button", { name: /create wedding space/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Already has wedding.");

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: vi.fn().mockRejectedValue(new Error("not json")) });
    await user.click(screen.getByRole("button", { name: /create wedding space/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not create your wedding.");

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await user.click(screen.getByRole("button", { name: /create wedding space/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not reach your wedding space.");
  });
});

describe("logout button", () => {
  beforeEach(() => {
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it("navigates away after successful or stale-session logout", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ success: true })).mockResolvedValueOnce(response({}, false, 401));
    vi.stubGlobal("fetch", fetchMock);
    render(<LogoutButton />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(router.refresh).toHaveBeenCalledTimes(2);
  });

  it("shows server and network failures", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(response({}, false, 500)).mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    render(<LogoutButton />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not sign you out.");
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not reach your wedding space.");
  });
});
