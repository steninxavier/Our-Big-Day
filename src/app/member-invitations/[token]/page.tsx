import Link from "next/link";
import LogoutButton from "@/app/(dashboard)/dashboard/logout-button";
import { getMemberInvitation } from "@/modules/members/invitation.service";
import { getOptionalCurrentUser } from "@/server/auth/current-user";
import { AppError } from "@/shared/errors/app-error";
import { memberRoleLabel } from "@/shared/auth/member-roles";
import buttonStyles from "@/shared/ui/action-button.module.css";
import AcceptButton from "./accept-button";

export const metadata = { title: "Wedding member invitation", robots: { index: false, follow: false } };

export default async function MemberInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invitation;
  try { invitation = await getMemberInvitation(token); }
  catch (error) { if (!(error instanceof AppError) || error.code !== "NOT_FOUND") throw error; }
  const currentUser = invitation ? await getOptionalCurrentUser() : null;
  const next = `/member-invitations/${token}`;

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-5 py-16 text-[#17233a]">
      <section className="mx-auto max-w-xl rounded-2xl border border-[#17233a]/15 bg-white/80 p-7 shadow-sm sm:p-10" aria-labelledby="invitation-heading">
        <Link href="/" className="text-sm font-semibold tracking-wide text-[#8c6932]">OUR BIG DAY</Link>
        {invitation ? <>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#8c6932]">A private invitation</p>
          <h1 id="invitation-heading" className="mt-3 text-3xl font-semibold">Plan together.</h1>
          <p className="mt-4 leading-7 text-[#75655b]">You&apos;re invited to {invitation.wedding.brideName} &amp; {invitation.wedding.groomName}&apos;s wedding space as {memberRoleLabel(invitation.role)}.</p>
          <p className="mt-4 text-sm text-[#75655b]">Invited email: <strong className="text-[#17233a]">{invitation.email}</strong></p>
          {!currentUser ? <div className="mt-7 flex flex-wrap gap-4"><Link className={buttonStyles.button} href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link><Link className="rounded-lg border border-[#17233a]/30 px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b58a42]" href={`/signup?next=${encodeURIComponent(next)}`}>Create account</Link></div>
            : currentUser.user.email.toLowerCase() !== invitation.email ? <div className="mt-6"><p role="alert" className="mb-4 text-sm text-[#a44932]">You&apos;re signed in with a different email. Sign out and reopen your invitation to use the invited account.</p><LogoutButton containerClassName="flex flex-col items-start gap-2" /></div>
            : currentUser.membership ? <p className="mt-6 text-sm text-[#a44932]">Your account already belongs to a wedding space. Accounts can join one wedding in this version.</p>
            : <AcceptButton token={token} />}
        </> : <><h1 id="invitation-heading" className="mt-8 text-3xl font-semibold">Invitation unavailable</h1><p className="mt-4 leading-7 text-[#75655b]">This invitation may have expired or already been used. Please ask the wedding admin for a new invitation.</p></>}
      </section>
    </main>
  );
}
