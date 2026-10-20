import { redirect } from "next/navigation";
import { expenseSummary, listExpenseEvents, listExpenseVendors, listExpenses } from "@/modules/expenses/expense.service";
import { getOptionalCurrentUser } from "@/server/auth/current-user";
import DashboardShell from "../dashboard-shell";
import ExpensesPanel from "./expenses-panel";

export const metadata = { title: "Wedding expenses" };
export default async function ExpensesPage() {
  const current = await getOptionalCurrentUser();
  if (!current) redirect("/login");
  if (!current.wedding || !current.membership) redirect("/onboarding");
  if (current.membership.role !== "ADMIN" && current.membership.role !== "MANAGER") redirect("/dashboard");
  const [initial, summary, events, vendors] = await Promise.all([listExpenses(current.user.id, { page: 1, limit: 20 }), expenseSummary(current.user.id), listExpenseEvents(current.user.id), listExpenseVendors(current.user.id)]);
  return <DashboardShell active="expenses"><main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14"><ExpensesPanel initial={initial} initialSummary={summary} events={events} vendors={vendors} /></main></DashboardShell>;
}
