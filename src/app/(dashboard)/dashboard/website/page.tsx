import { redirect } from "next/navigation";

import { getOptionalCurrentUser } from "@/server/auth/current-user";
import { getWebsiteSettings } from "@/modules/weddings/website.service";

import DashboardShell from "../dashboard-shell";
import WebsiteSettingsPanel from "./website-settings-panel";

export const metadata = { title: "Wedding website" };

export default async function WebsiteSettingsPage() {
  const current = await getOptionalCurrentUser();
  if (!current) redirect("/login");
  if (!current.wedding || !current.membership) redirect("/onboarding");
  if (current.membership.role !== "ADMIN" && current.membership.role !== "MANAGER") redirect("/dashboard");
  const settings = await getWebsiteSettings(current.user.id);
  return <DashboardShell active="website"><main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14"><WebsiteSettingsPanel initial={settings} /></main></DashboardShell>;
}
