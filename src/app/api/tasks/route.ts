import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { listTasks, createTask } from "@/modules/tasks/task.service";
import { taskQuerySchema, taskSchema } from "@/modules/tasks/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function GET(request: Request) { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); const params = Object.fromEntries(new URL(request.url).searchParams); const result = await listTasks(current.user.id, taskQuerySchema.parse(params)); return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } }); }); }
export async function POST(request: Request) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await createTask(current.user.id, await parseJson(request, taskSchema)), { status: 201 }); }); }
