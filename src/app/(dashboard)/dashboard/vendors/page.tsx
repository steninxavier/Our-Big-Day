import { redirect } from "next/navigation";
import { getOptionalCurrentUser } from "@/server/auth/current-user";
import { listVendorEvents, listVendors, vendorSummary } from "@/modules/vendors/vendor.service";
import DashboardShell from "../dashboard-shell";
import VendorsPanel from "./vendors-panel";

export const metadata = { title: "My vendors" };

export default async function VendorsPage() {
  const current = await getOptionalCurrentUser();
  if (!current) redirect("/login");
  if (!current.wedding || !current.membership) redirect("/onboarding");
  if (current.membership.role !== "ADMIN" && current.membership.role !== "MANAGER") redirect("/dashboard");
  const [initial, summary, events] = await Promise.all([listVendors(current.user.id, { page: 1, limit: 20, includeArchived: false }), vendorSummary(current.user.id), listVendorEvents(current.user.id)]);
  return <DashboardShell active="vendors"><main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14"><VendorsPanel initial={initial} initialSummary={summary} events={events} /></main></DashboardShell>;
}
