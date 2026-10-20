import { getCurrentUser } from "@/modules/auth/auth.service";
import { archiveVendor, getVendor, patchVendor } from "@/modules/vendors/vendor.service";
import { vendorPatchSchema } from "@/modules/vendors/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

type Context = { params: Promise<{ vendorId: string }> };
export async function GET(_request: Request, context: Context) { return handleRoute(async () => { const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await getVendor(current.user.id, (await context.params).vendorId), { headers: { "Cache-Control": "no-store" } }); }); }
export async function PATCH(request: Request, context: Context) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); const { expectedRevision, ...changes } = await parseJson(request, vendorPatchSchema); return dataResponse(await patchVendor(current.user.id, (await context.params).vendorId, changes, expectedRevision), { headers: { "Cache-Control": "no-store" } }); }); }
export async function DELETE(request: Request, context: Context) { return handleRoute(async () => { requireSameOrigin(request); const current = await getCurrentUser(await getSessionTokenFromCookie()); return dataResponse(await archiveVendor(current.user.id, (await context.params).vendorId), { headers: { "Cache-Control": "no-store" } }); }); }
