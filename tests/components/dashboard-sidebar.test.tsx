import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
import DashboardHeader from "@/app/(dashboard)/dashboard/dashboard-header";

describe("dashboard navigation", () => {
  it("links to all planning pages and marks the current page", () => {
    render(<DashboardHeader active="tasks" />);
    const nav = within(screen.getByRole("navigation", { name: "Wedding navigation" }));
    expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(nav.getByRole("link", { name: "Wedding events" })).toHaveAttribute("href", "/dashboard/events");
    expect(nav.getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: "Guests" })).toHaveAttribute("href", "/dashboard/guests");
    expect(nav.getByRole("link", { name: "Wedding members" })).toHaveAttribute("href", "/dashboard/members");
  });
  it("hides the member directory for coordinators", () => {
    render(<DashboardHeader active="events" showMembers={false} />);
    expect(screen.queryByRole("link", { name: "Expenses" })).not.toBeInTheDocument();
    const nav = within(screen.getByRole("navigation", { name: "Wedding navigation" }));
    expect(nav.queryByRole("link", { name: "Wedding members" })).not.toBeInTheDocument();
    expect(nav.queryByRole("link", { name: "Guests" })).not.toBeInTheDocument();
    expect(nav.getByRole("link", { name: "Wedding events" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: "Tasks" })).toBeInTheDocument();
  });
  it("expands the mobile menu and closes it after a selection", () => {
    render(<DashboardHeader active="dashboard" />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Wedding navigation" })).getByRole("link", { name: "Tasks" }));
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });
});
