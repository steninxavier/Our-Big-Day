"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import buttonStyles from "@/shared/ui/action-button.module.css";

export default function MemberAction({ kind, id, label, self = false }: { kind: "member" | "invitation"; id: string; label: string; self?: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const action = kind === "member" ? "Remove" : "Revoke";

  async function submit() {
    setPending(true);
    setError("");
    try {
      const path = kind === "member" ? `/api/members/${id}` : `/api/members/invitations/${id}`;
      const response = await fetch(path, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? `Could not ${action.toLowerCase()} ${label}.`);
        return;
      }
      if (self) router.replace("/onboarding");
      router.refresh();
    } catch {
      setError(`Could not ${action.toLowerCase()} ${label}. Please try again.`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="basis-full sm:basis-auto sm:text-right">
      {!confirming ? <button type="button" onClick={() => setConfirming(true)} className="cursor-pointer rounded-md border border-[#bcae97] px-3 py-2 text-xs font-semibold text-[#714439] hover:bg-[#f8f4ec] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b58a42]" aria-label={`${action} ${label}`}>{action}</button> : <div className="space-y-2">
        <p className="text-sm text-[#75655b]">{kind === "member" ? `${self ? "You will" : `${label} will`} lose access to this wedding.` : `The invitation for ${label} will no longer work.`}</p>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button type="button" disabled={pending} onClick={submit} className={buttonStyles.button}>{pending ? "Please wait…" : `Confirm ${action.toLowerCase()}`}</button>
          <button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(""); }} className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-[#17233a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b58a42] disabled:cursor-wait">Cancel</button>
        </div>
      </div>}
      {error && <p role="alert" className="mt-2 text-sm text-[#a44932]">{error}</p>}
    </div>
  );
}
