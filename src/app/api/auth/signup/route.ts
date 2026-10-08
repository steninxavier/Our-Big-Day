import { signUp } from "@/modules/auth/auth.service";
import { signUpSchema } from "@/modules/auth/schemas";
import { parseJson } from "@/shared/http/request";
import { dataResponse, handleRoute } from "@/shared/http/response";
import { setSessionCookie } from "@/server/auth/session-cookie";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const result = await signUp(await parseJson(request, signUpSchema));
    await setSessionCookie(result.sessionToken);

    return dataResponse({ user: result.user, hasWedding: result.hasWedding }, { status: 201 });
  });
}
