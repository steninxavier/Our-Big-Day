import { getCurrentUser } from "@/modules/auth/auth.service";
import { deleteExpense, getExpense, patchExpense } from "@/modules/expenses/expense.service";
import { expensePatchSchema } from "@/modules/expenses/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute, successResponse } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";
type Context = { params: Promise<{ expenseId: string }> };
export async function GET(_request: Request, context: Context) { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await getExpense(current.user.id, (await context.params).expenseId), { headers: { "Cache-Control": "no-store" } }); }); }
export async function PATCH(request: Request, context: Context) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); const { expectedRevision, ...changes } = await parseJson(request, expensePatchSchema); return dataResponse(await patchExpense(current.user.id, (await context.params).expenseId, changes, expectedRevision), { headers: { "Cache-Control": "no-store" } }); }); }
export async function DELETE(request: Request, context: Context) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); await deleteExpense(current.user.id, (await context.params).expenseId); return successResponse({ headers: { "Cache-Control": "no-store" } }); }); }
