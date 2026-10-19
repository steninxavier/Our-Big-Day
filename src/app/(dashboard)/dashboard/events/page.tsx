import { redirect } from "next/navigation";
import { listEvents } from "@/modules/events/event.service";
import { listWeddingMembers } from "@/modules/members/member-directory.service";
import { getOptionalCurrentUser } from "@/server/auth/current-user";
import DashboardHeader from "../dashboard-header";
import EventsPanel from "./events-panel";

export const metadata = { title: "Wedding events" };

export default async function EventsPage() {
  const current = await getOptionalCurrentUser();
  if (!current) redirect("/login");
  if (!current.wedding || !current.membership) redirect("/onboarding");
  const canManage = current.membership.role === "ADMIN" || current.membership.role === "MANAGER";
  const [events, members] = await Promise.all([listEvents(current.user.id), canManage ? listWeddingMembers(current.user.id) : Promise.resolve([])]);
  const coordinators = members.filter((member) => member.role === "EVENT_COORDINATOR").map((member) => ({ id: member.membershipId, name: member.user.name }));
  return <><DashboardHeader active="events" showMembers={canManage} /><main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a783d]">Your celebrations</p><h1 className="mt-3 font-[family-name:var(--font-playfair)] text-4xl font-semibold text-[#17233a] sm:text-5xl">Wedding events</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#75655b]">{canManage ? "Bring each part of your celebration together in one private place." : "The celebrations assigned to you appear here."}</p><EventsPanel events={events} coordinators={coordinators} canManage={canManage} timeZone={current.wedding.timeZone} /></main></>;
}
