import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VendorsPanel from "@/app/(dashboard)/dashboard/vendors/vendors-panel";

const vendor = { id: "111111111111111111111111", name: "Malabar Frames", category: "PHOTOGRAPHER" as const, contactPerson: "Asha", phone: "+91 98765 43210", email: "asha@example.com", address: "Kochi", website: "https://example.com", totalAgreedCostPaise: 2500000, eventIds: ["222222222222222222222222"], notes: "Drone included", source: "MANUAL" as const, archivedAt: null, revision: 0 };
const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 };
const summary = { count: 1, totalAgreedCostPaise: 2500000, categoryCount: 1, byCategory: [{ category: "PHOTOGRAPHER", count: 1 }] };
const events = [{ id: vendor.eventIds[0], name: "Reception", archived: false }, { id: "333333333333333333333333", name: "Old ceremony", archived: true }];
function result(data: unknown, ok = true) { return { ok, json: async () => data }; }
beforeEach(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); }; });
describe("vendor panel", () => {
  it("renders aligned vendor details and opens a current editable record", async () => {
    const fetchMock = vi.fn().mockResolvedValue(result({ data: vendor })); vi.stubGlobal("fetch", fetchMock);
    render(<VendorsPanel initial={{ data: [vendor], pagination }} initialSummary={summary} events={events} />);
    expect(screen.getByRole("cell", { name: /Malabar Frames/ })).toBeInTheDocument(); expect(screen.getAllByText("Reception").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Edit Malabar Frames" }));
    const dialog = await screen.findByRole("dialog"); expect(within(dialog).getByLabelText("Vendor name")).toHaveValue("Malabar Frames"); expect(within(dialog).getByText("Reception")).toBeInTheDocument();
  });
  it("keeps archived events only when they are already associated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(result({ data: vendor })));
    render(<VendorsPanel initial={{ data: [vendor], pagination }} initialSummary={summary} events={events} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add vendor" })); expect(within(screen.getByRole("dialog")).queryByText("Old ceremony (Archived)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" })); fireEvent.click(screen.getByRole("button", { name: "Edit Malabar Frames" })); expect(await screen.findByRole("dialog")).toHaveTextContent("Reception");
  });
});
