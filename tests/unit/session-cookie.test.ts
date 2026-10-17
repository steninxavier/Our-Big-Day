import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import { clearSessionCookie, getSessionTokenFromCookie, setSessionCookie } from "@/server/auth/session-cookie";

describe("session cookies", () => {
  beforeEach(() => {
    cookieStore.get.mockReset();
    cookieStore.set.mockReset();
    vi.unstubAllEnvs();
  });

  it("reads the configured cookie name", async () => {
    vi.stubEnv("SESSION_COOKIE_NAME", "custom_session");
    cookieStore.get.mockReturnValue({ value: "token" });
    await expect(getSessionTokenFromCookie()).resolves.toBe("token");
    expect(cookieStore.get).toHaveBeenCalledWith("custom_session");
  });

  it("returns undefined when no session cookie exists", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(getSessionTokenFromCookie()).resolves.toBeUndefined();
  });

  it("sets secure production cookies and clears them with the same protections", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await setSessionCookie("secret-token");
    expect(cookieStore.set).toHaveBeenCalledWith("our_big_day_session", "secret-token", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 2_592_000,
    });

    await clearSessionCookie();
    expect(cookieStore.set).toHaveBeenLastCalledWith("our_big_day_session", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  });

  it("keeps local-development cookies non-secure", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await setSessionCookie("token");
    expect(cookieStore.set).toHaveBeenCalledWith("our_big_day_session", "token", expect.objectContaining({ secure: false }));
  });
});
