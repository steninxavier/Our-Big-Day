import { redirect } from "next/navigation";
import { listEvents } from "@/modules/events/event.service";
import { listGuests } from "@/modules/guests/guest.service";
import { getOptionalCurrentUser } from "@/server/auth/current-user";
import DashboardShell from "../dashboard-shell";
import GuestsPanel from "./guests-panel";

export const metadata = { title: "Guest management" };
export default async function GuestsPage() {
  const current = await getOptionalCurrentUser();
  if (!current) redirect("/login");
  if (!current.wedding || !current.membership) redirect("/onboarding");
  if (current.membership.role !== "ADMIN" && current.membership.role !== "MANAGER") redirect("/dashboard");
  const [guests, events] = await Promise.all([listGuests(current.user.id, { page: 1, limit: 20 }), listEvents(current.user.id)]);
  return <DashboardShell active="guests"><main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14"><GuestsPanel initial={guests} events={events.map((event) => ({ id: event.id, name: event.name }))} /></main></DashboardShell>;
}
