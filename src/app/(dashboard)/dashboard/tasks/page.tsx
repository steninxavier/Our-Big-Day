import { redirect } from "next/navigation";
import { listEvents } from "@/modules/events/event.service";
import { listWeddingMembers } from "@/modules/members/member-directory.service";
import { listTasks } from "@/modules/tasks/task.service";
import { getOptionalCurrentUser } from "@/server/auth/current-user";
import DashboardShell from "../dashboard-shell";
import TasksPanel from "./tasks-panel";

export const metadata = { title: "Wedding tasks" };
export default async function TasksPage() {
  const current = await getOptionalCurrentUser();
  if (!current) redirect("/login");
  if (!current.wedding || !current.membership) redirect("/onboarding");
  const canManage = current.membership.role === "ADMIN" || current.membership.role === "MANAGER";
  const [tasks, events, members] = await Promise.all([
    listTasks(current.user.id, { page: 1, limit: 20 }),
    listEvents(current.user.id),
    canManage ? listWeddingMembers(current.user.id) : Promise.resolve([]),
  ]);
  return <DashboardShell active="tasks" showMembers={canManage}><main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14"><TasksPanel initial={tasks} events={events.map((event) => ({ id: event.id, name: event.name }))} members={members.map((member) => ({ id: member.membershipId, name: member.user.name }))} canManage={canManage} timeZone={current.wedding.timeZone} /></main></DashboardShell>;
}
