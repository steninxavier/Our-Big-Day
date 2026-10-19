import { getCurrentUser } from "@/modules/auth/auth.service";
import { archiveEvent, getEvent, patchEvent } from "@/modules/events/event.service";
import { eventPatchSchema } from "@/modules/events/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute, successResponse } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

type Context = { params: Promise<{ eventId: string }> };
export async function GET(_request: Request, context: Context) { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); const { eventId } = await context.params; return dataResponse(await getEvent(current.user.id, eventId), { headers: { "Cache-Control": "no-store" } }); }); }
export async function PATCH(request: Request, context: Context) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); const { eventId } = await context.params; return dataResponse(await patchEvent(current.user.id, eventId, await parseJson(request, eventPatchSchema))); }); }
export async function DELETE(request: Request, context: Context) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); const { eventId } = await context.params; await archiveEvent(current.user.id, eventId); return successResponse(); }); }
