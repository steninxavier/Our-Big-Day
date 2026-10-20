import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { createVendor, listVendors } from "@/modules/vendors/vendor.service";
import { vendorQuerySchema, vendorSchema } from "@/modules/vendors/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

export async function GET(request: Request) { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); return NextResponse.json(await listVendors(current.user.id, vendorQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams))), { headers: { "Cache-Control": "no-store" } }); }); }
export async function POST(request: Request) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await createVendor(current.user.id, await parseJson(request, vendorSchema)), { status: 201, headers: { "Cache-Control": "no-store" } }); }); }
