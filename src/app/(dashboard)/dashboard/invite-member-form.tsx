"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import buttonStyles from "@/shared/ui/action-button.module.css";
import { memberRoleLabel, type MemberRole } from "@/shared/auth/member-roles";

export default function InviteMemberForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("MANAGER");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/members/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), role }) });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error?.message ?? "We could not send your invitation."); return; }
      setMessage(`Invitation sent. They can join as ${memberRoleLabel(role)} using the link in their email.`);
      setEmail("");
      router.refresh();
    } catch { setError("We could not send your invitation. Please try again."); }
    finally { setPending(false); }
  }

  return (
    <section aria-labelledby="invite-title" className="rounded-xl border border-[#17233a]/12 bg-[#fdfbf7] p-6 shadow-[0_22px_44px_-38px_rgba(23,35,58,0.52)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c6932]">Plan together</p>
      <h2 id="invite-title" className="mt-3 font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#17233a]">Invite someone to help</h2>
      <p className="mt-2 text-sm leading-6 text-[#75655b]">Choose a role for someone you trust. Admins can manage members; managers can help plan. Event coordinators will only be able to access assigned events when event management is available.</p>
      <form className="mt-6" onSubmit={submit} noValidate aria-busy={pending}>
        <label className="block text-sm font-semibold text-[#17233a]" htmlFor="invite-role">Role</label>
        <select id="invite-role" value={role} onChange={(event) => setRole(event.target.value as MemberRole)} className="mt-2 mb-5 min-h-[46px] w-full rounded-[7px] border border-[#17233a]/25 bg-white px-4 text-[#17233a] focus:border-[#17233a] focus:outline-none focus:shadow-[0_0_0_3px_rgba(181,138,66,0.18)]">
          <option value="MANAGER">Manager</option>
          <option value="EVENT_COORDINATOR">Event Coordinator</option>
          <option value="ADMIN">Admin</option>
        </select>
        {role === "ADMIN" && <p className="mb-5 text-sm leading-6 text-[#8a4b35]">Admins have full access and can invite other admins. Only choose this role for someone you trust.</p>}
        <label className="block text-sm font-semibold text-[#17233a]" htmlFor="invite-email">Email address</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input id="invite-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "invite-error" : undefined} className="min-h-[46px] min-w-0 flex-1 rounded-[7px] border border-[#17233a]/25 bg-white px-4 py-3 text-[#17233a] focus:border-[#17233a] focus:outline-none focus:shadow-[0_0_0_3px_rgba(181,138,66,0.18)] aria-invalid:border-[#a44932]" />
          <button disabled={pending} className={buttonStyles.button} type="submit">
            {pending ? "Sending…" : "Send invitation"}
            <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.75 8h9.5M8.75 4.5 12.25 8l-3.5 3.5" /></svg>
          </button>
        </div>
        {error && <p id="invite-error" role="alert" className="mt-3 text-sm text-[#a44932]">{error}</p>}
        {message && <p role="status" className="mt-3 text-sm text-[#426146]">{message}</p>}
      </form>
    </section>
  );
}
