import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  signUp: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  createWedding: vi.fn(),
  parseJson: vi.fn(),
  getSessionTokenFromCookie: vi.fn(),
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

vi.mock("@/modules/auth/auth.service", () => ({
  login: mocks.login,
  signUp: mocks.signUp,
  logout: mocks.logout,
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/modules/weddings/wedding.service", () => ({ createWedding: mocks.createWedding }));
vi.mock("@/shared/http/request", () => ({ parseJson: mocks.parseJson }));
vi.mock("@/server/auth/session-cookie", () => ({
  getSessionTokenFromCookie: mocks.getSessionTokenFromCookie,
  setSessionCookie: mocks.setSessionCookie,
  clearSessionCookie: mocks.clearSessionCookie,
}));

import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { GET as currentUserGet } from "@/app/api/auth/me/route";
import { POST as signupPost } from "@/app/api/auth/signup/route";
import { GET as healthGet } from "@/app/api/health/route";
import { POST as weddingPost } from "@/app/api/wedding/route";
import { AppError } from "@/shared/errors/app-error";

async function responseJson(response: Response) {
  return response.json();
}

describe("route handlers", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.getSessionTokenFromCookie.mockResolvedValue("session-token");
  });

  it("reports healthy service status", async () => {
    expect(await responseJson(await healthGet())).toEqual({ data: { status: "ok" } });
  });

  it("logs in after parsing validation and writes the server cookie", async () => {
    mocks.parseJson.mockResolvedValue({ email: "liya@example.com", password: "password1" });
    mocks.login.mockResolvedValue({ user: { id: "user-1" }, hasWedding: true, sessionToken: "new-token" });
    const response = await loginPost(new Request("http://test/api/auth/login", { method: "POST" }));
    expect(await responseJson(response)).toEqual({ data: { user: { id: "user-1" }, hasWedding: true } });
    expect(mocks.setSessionCookie).toHaveBeenCalledWith("new-token");
  });

  it("creates an account with a 201 response", async () => {
    mocks.parseJson.mockResolvedValue({ name: "Liya", email: "liya@example.com", password: "password1" });
    mocks.signUp.mockResolvedValue({ user: { id: "user-1" }, hasWedding: false, sessionToken: "new-token" });
    const response = await signupPost(new Request("http://test/api/auth/signup", { method: "POST" }));
    expect(response.status).toBe(201);
    expect(await responseJson(response)).toEqual({ data: { user: { id: "user-1" }, hasWedding: false } });
    expect(mocks.setSessionCookie).toHaveBeenCalledWith("new-token");
  });

  it("returns the current user and uses the session cookie", async () => {
    mocks.getCurrentUser.mockResolvedValue({ user: { id: "user-1" }, membership: null, wedding: null });
    expect(await responseJson(await currentUserGet())).toEqual({ data: { user: { id: "user-1" }, membership: null, wedding: null } });
    expect(mocks.getCurrentUser).toHaveBeenCalledWith("session-token");
  });

  it("creates a wedding for the server-derived user only", async () => {
    mocks.getCurrentUser.mockResolvedValue({ user: { id: "user-1" } });
    mocks.parseJson.mockResolvedValue({ brideName: "Liya" });
    mocks.createWedding.mockResolvedValue({ id: "wedding-1" });
    const response = await weddingPost(new Request("http://test/api/wedding", { method: "POST" }));
    expect(response.status).toBe(201);
    expect(await responseJson(response)).toEqual({ data: { id: "wedding-1" } });
    expect(mocks.createWedding).toHaveBeenCalledWith("user-1", { brideName: "Liya" });
  });

  it("clears browser state after successful, missing, and failed logout attempts", async () => {
    await expect(responseJson(await logoutPost())).resolves.toEqual({ success: true });
    expect(mocks.logout).toHaveBeenCalledWith("session-token");
    expect(mocks.clearSessionCookie).toHaveBeenCalledTimes(1);

    mocks.logout.mockRejectedValue(new AppError("UNAUTHENTICATED", "No session", 401));
    const unauthorized = await logoutPost();
    expect(unauthorized.status).toBe(401);
    expect(mocks.clearSessionCookie).toHaveBeenCalledTimes(2);

    mocks.clearSessionCookie.mockRejectedValue(new Error("cookie storage failed"));
    const broken = await logoutPost();
    expect(broken.status).toBe(500);
  });
});
