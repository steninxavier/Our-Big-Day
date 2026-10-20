import { getCurrentUser } from "@/modules/auth/auth.service";
import { expenseSummary } from "@/modules/expenses/expense.service";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { dataResponse, handleRoute } from "@/shared/http/response";
export async function GET() { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await expenseSummary(current.user.id), { headers: { "Cache-Control": "no-store" } }); }); }
