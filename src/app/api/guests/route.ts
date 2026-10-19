import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { createGuest, listGuests } from "@/modules/guests/guest.service";
import { guestQuerySchema, guestSchema } from "@/modules/guests/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function GET(request: Request) { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); const query = guestQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams)); return NextResponse.json(await listGuests(current.user.id, query), { headers: { "Cache-Control": "no-store" } }); }); }
export async function POST(request: Request) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await createGuest(current.user.id, await parseJson(request, guestSchema)), { status: 201, headers: { "Cache-Control": "no-store" } }); }); }
