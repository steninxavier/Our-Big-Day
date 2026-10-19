import { getCurrentUser } from "@/modules/auth/auth.service";
import { deleteGuest, getGuest, patchGuest } from "@/modules/guests/guest.service";
import { guestPatchSchema } from "@/modules/guests/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute, successResponse } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

type Context = { params: Promise<{ guestId: string }> };
export async function GET(_request: Request, context: Context) { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await getGuest(current.user.id, (await context.params).guestId), { headers: { "Cache-Control": "no-store" } }); }); }
export async function PATCH(request: Request, context: Context) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); const { expectedRevision, ...changes } = await parseJson(request, guestPatchSchema); return dataResponse(await patchGuest(current.user.id, (await context.params).guestId, changes, expectedRevision), { headers: { "Cache-Control": "no-store" } }); }); }
export async function DELETE(request: Request, context: Context) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); await deleteGuest(current.user.id, (await context.params).guestId); return successResponse({ headers: { "Cache-Control": "no-store" } }); }); }
