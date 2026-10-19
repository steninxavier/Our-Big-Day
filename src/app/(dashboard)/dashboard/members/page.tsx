import { redirect } from "next/navigation";
import { listPendingMemberInvitations, listWeddingMembers } from "@/modules/members/member-directory.service";
import { getOptionalCurrentUser } from "@/server/auth/current-user";
import { memberRoleLabel } from "@/shared/auth/member-roles";
import DashboardShell from "../dashboard-shell";
import InviteMemberForm from "../invite-member-form";
import MemberAction from "./member-action";

export const metadata = { title: "Wedding members" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export default async function MembersPage() {
  const currentUser = await getOptionalCurrentUser();
  if (!currentUser) redirect("/login");
  if (!currentUser.wedding || !currentUser.membership) redirect("/onboarding");
  if (currentUser.membership.role !== "ADMIN" && currentUser.membership.role !== "MANAGER") redirect("/dashboard");
  const isAdmin = currentUser.membership.role === "ADMIN";
  const [members, invitations] = await Promise.all([
    listWeddingMembers(currentUser.user.id),
    isAdmin ? listPendingMemberInvitations(currentUser.user.id) : Promise.resolve([]),
  ]);

  return (
    <DashboardShell active="members">
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a783d]">Your wedding team</p>
          <h1 className="mt-3 font-[family-name:var(--font-playfair)] text-4xl font-semibold tracking-tight text-[#17233a] sm:text-5xl">Wedding members</h1>
          <p className="mt-4 text-sm leading-7 text-[#75655b]">Bring your trusted people together in one private space for {currentUser.wedding.brideName} &amp; {currentUser.wedding.groomName}&apos;s celebration.</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] lg:items-start">
          <div className="space-y-6">
            <section aria-labelledby="members-heading" className="rounded-xl border border-[#17233a]/12 bg-[#fdfbf7] p-6 shadow-[0_22px_44px_-38px_rgba(23,35,58,0.52)] sm:p-8">
              <div className="flex items-start justify-between gap-4"><div><h2 id="members-heading" className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#17233a]">Your members</h2><p className="mt-2 text-sm text-[#75655b]">People who can access this wedding space.</p></div><span className="rounded-full bg-[#f2ebdc] px-3 py-1 text-xs font-semibold text-[#78623c]">{members.length} {members.length === 1 ? "member" : "members"}</span></div>
              <ul className="mt-6 divide-y divide-[#eee7d9]">
                {members.map((member: { membershipId: string; user: { id: string; name: string; email: string }; role: string; joinedAt: string }) => {
                  const isYou = member.user.id === currentUser.user.id;
                  return <li key={member.membershipId} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"><span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eae3d5] text-sm font-bold text-[#6c593c]">{member.user.name.trim().charAt(0).toUpperCase() || "?"}</span><div className="min-w-0 flex-1"><p className="break-words font-semibold text-[#17233a]">{member.user.name} {isYou && <span className="ml-1 text-xs font-medium text-[#8c6932]">You</span>}</p><p className="mt-1 break-all text-sm text-[#75655b]">{member.user.email}</p><p className="mt-1 text-xs text-[#8b8176]">Joined {formatDate(member.joinedAt)}</p></div><span className="rounded-full border border-[#dfd6c4] px-3 py-1 text-xs font-semibold text-[#6e5e43]">{memberRoleLabel(member.role)}</span>{isAdmin && <MemberAction kind="member" id={member.membershipId} label={member.user.name} self={isYou} />}</li>;
                })}
              </ul>
            </section>

            {isAdmin && <section aria-labelledby="pending-heading" className="rounded-xl border border-[#17233a]/12 bg-[#fdfbf7] p-6 shadow-[0_22px_44px_-38px_rgba(23,35,58,0.52)] sm:p-8"><div className="flex items-start justify-between gap-4"><div><h2 id="pending-heading" className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#17233a]">Pending invitations</h2><p className="mt-2 text-sm text-[#75655b]">Invitations waiting to be accepted.</p></div><span className="rounded-full bg-[#f2ebdc] px-3 py-1 text-xs font-semibold text-[#78623c]">{invitations.length} pending</span></div>{invitations.length ? <ul className="mt-6 divide-y divide-[#eee7d9]">{invitations.map((invitation: { id: string; email: string; role: string; expiresAt: string }) => <li key={invitation.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><p className="break-all text-sm font-semibold text-[#17233a]">{invitation.email}</p><p className="mt-1 text-xs text-[#75655b]">{memberRoleLabel(invitation.role)} · Expires {formatDate(invitation.expiresAt)} (UTC)</p></div><MemberAction kind="invitation" id={invitation.id} label={invitation.email} /></li>)}</ul> : <p className="mt-6 rounded-xl bg-[#f8f4ec] px-4 py-5 text-sm text-[#75655b]">No pending invitations yet. Invited members will appear here until they accept or their invitation expires.</p>}</section>}
          </div>
          {isAdmin ? <InviteMemberForm /> : <aside className="rounded-xl border border-[#17233a]/12 bg-[#fdfbf7] p-6 text-sm leading-7 text-[#75655b] shadow-[0_22px_44px_-38px_rgba(23,35,58,0.52)] sm:p-8"><p className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#17233a]">Planning together</p><p className="mt-2">Only wedding admins can invite members. Contact an admin if someone else should join your team.</p></aside>}
        </div>
      </main>
    </DashboardShell>
  );
}
