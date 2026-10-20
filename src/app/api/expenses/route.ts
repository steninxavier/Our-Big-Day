import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { createExpense, listExpenses } from "@/modules/expenses/expense.service";
import { expenseQuerySchema, expenseSchema } from "@/modules/expenses/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";
export async function GET(request: Request) { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); return NextResponse.json(await listExpenses(current.user.id, expenseQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))), { headers: { "Cache-Control": "no-store" } }); }); }
export async function POST(request: Request) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await createExpense(current.user.id, await parseJson(request, expenseSchema)), { status: 201, headers: { "Cache-Control": "no-store" } }); }); }
