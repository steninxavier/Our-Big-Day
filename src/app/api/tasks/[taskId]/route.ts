import { getCurrentUser } from "@/modules/auth/auth.service";
import { getTask, patchTask, deleteTask } from "@/modules/tasks/task.service";
import { taskPatchSchema } from "@/modules/tasks/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute, successResponse } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

type Context = { params: Promise<{ taskId: string }> };
export async function GET(_request: Request, context: Context) { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await getTask(current.user.id, (await context.params).taskId), { headers: { "Cache-Control": "no-store" } }); }); }
export async function PATCH(request: Request, context: Context) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); const { expectedRevision, ...changes } = await parseJson(request, taskPatchSchema); return dataResponse(await patchTask(current.user.id, (await context.params).taskId, changes, expectedRevision)); }); }
export async function DELETE(request: Request, context: Context) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); await deleteTask(current.user.id, (await context.params).taskId); return successResponse(); }); }
