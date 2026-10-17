import { redirect } from "next/navigation";

import { getOptionalCurrentUser } from "@/server/auth/current-user";

import DashboardHeader from "./dashboard-header";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const currentUser = await getOptionalCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.wedding) {
    redirect("/onboarding");
  }

  const firstName = currentUser.user.name.trim().split(/\s+/)[0] || "there";
  const weddingName = `${currentUser.wedding.brideName} & ${currentUser.wedding.groomName}`;

  return (
    <>
    <DashboardHeader active="dashboard" showMembers={currentUser.membership?.role === "ADMIN" || currentUser.membership?.role === "MANAGER"} />
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-[#a44932] uppercase">Wedding dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold">Welcome, {firstName}.</h1>
          <p className="mt-2 text-sm font-medium text-[#75655b]">{weddingName} · {currentUser.wedding.weddingDate}</p>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-[#75655b]">
        {currentUser.membership?.role === "EVENT_COORDINATOR" ? "Your assigned events will appear here when event management is available. You do not have access to other wedding planning information." : "Dashboard aggregation, membership protection, and each planning module are represented in the server scaffold."}
      </p>
    </main>
    </>
  );
}
