import { getCurrentUser } from "@/modules/auth/auth.service";
import { createEvent, listEvents } from "@/modules/events/event.service";
import { eventSchema } from "@/modules/events/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function GET() { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await listEvents(current.user.id), { headers: { "Cache-Control": "no-store" } }); }); }
export async function POST(request: Request) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await createEvent(current.user.id, await parseJson(request, eventSchema)), { status: 201 }); }); }
