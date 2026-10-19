import { z } from "zod";
import { getCurrentUser } from "@/modules/auth/auth.service";
import { sendGuestEmail } from "@/modules/guests/guest-email.service";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { handleSensitiveRoute } from "@/server/http/sensitive-route";
import { dataResponse } from "@/shared/http/response";
import { requireSameOrigin } from "@/shared/http/same-origin";

const paramsSchema = z.object({ guestId: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
export async function POST(request: Request, context: { params: Promise<{ guestId: string }> }) {
  return handleSensitiveRoute(async () => {
    requireSameOrigin(request);
    const current = await getCurrentUser(await getSessionTokenFromCookie());
    const { guestId } = paramsSchema.parse(await context.params);
    return dataResponse(await sendGuestEmail(current.user.id, guestId, "reminder"), { headers: { "Cache-Control": "no-store" } });
  });
}
