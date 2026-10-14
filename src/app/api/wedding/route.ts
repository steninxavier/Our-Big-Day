import { getCurrentUser } from "@/modules/auth/auth.service";
import { createWedding } from "@/modules/weddings/wedding.service";
import { createWeddingSchema } from "@/modules/weddings/schemas";
import { getSessionTokenFromCookie } from "@/server/auth/session-cookie";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute } from "@/shared/http/response";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const currentUser = await getCurrentUser(await getSessionTokenFromCookie());
    const wedding = await createWedding(currentUser.user.id, await parseJson(request, createWeddingSchema));

    return dataResponse(wedding, { status: 201 });
  });
}
