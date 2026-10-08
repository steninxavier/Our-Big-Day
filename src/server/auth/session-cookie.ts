import { cookies } from "next/headers";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

function sessionCookieName() {
  return process.env.SESSION_COOKIE_NAME || "our_big_day_session";
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

export async function getSessionTokenFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(sessionCookieName())?.value;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), token, cookieOptions());
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), "", { ...cookieOptions(), maxAge: 0 });
}
