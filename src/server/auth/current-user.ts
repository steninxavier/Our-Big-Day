import { cache } from "react";

import { getCurrentUser } from "@/modules/auth/auth.service";
import { AppError } from "@/shared/errors/app-error";

import { getSessionTokenFromCookie } from "./session-cookie";

/**
 * Resolves the current Couple session for Server Components. Invalid or expired
 * sessions intentionally behave like no session; unexpected failures still
 * reach the error boundary instead of silently granting access.
 */
export const getOptionalCurrentUser = cache(async () => {
  const sessionToken = await getSessionTokenFromCookie();

  if (!sessionToken) {
    return null;
  }

  try {
    return await getCurrentUser(sessionToken);
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") {
      return null;
    }

    throw error;
  }
});
