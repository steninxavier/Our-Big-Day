"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import buttonStyles from "@/shared/ui/action-button.module.css";

export default function AcceptButton({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function accept() {
    setError("");
    setPending(true);
    try {
      const response = await fetch(`/api/member-invitations/${token}/accept`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error?.message ?? "We could not accept this invitation."); return; }
      router.replace("/dashboard");
      router.refresh();
    } catch { setError("We could not accept this invitation. Please try again."); }
    finally { setPending(false); }
  }
  return <div className="mt-7">{error && <p role="alert" className="mb-4 text-sm text-[#a44932]">{error}</p>}<button type="button" disabled={pending} onClick={accept} className={buttonStyles.button}>{pending ? "Joining…" : "Accept invitation"}</button></div>;
}
