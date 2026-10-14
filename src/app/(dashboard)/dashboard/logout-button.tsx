"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setIsSigningOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      // A 401 means the request had no session cookie. Either way, the logout
      // route clears any browser cookie, so the correct next screen is sign-in.
      if (!response.ok && response.status !== 401) {
        setError("We could not sign you out. Please try again.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("We could not reach your wedding space. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error ? (
        <p className="text-sm text-[#a44932]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="rounded-full border border-[#17233a]/20 px-4 py-2 text-sm font-semibold text-[#17233a] transition hover:border-[#17233a] hover:bg-[#17233a] hover:text-[#f8f4ec] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSigningOut}
        onClick={signOut}
        type="button"
      >
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
