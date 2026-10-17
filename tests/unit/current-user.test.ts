import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getSessionTokenFromCookie: vi.fn(),
}));

vi.mock("@/modules/auth/auth.service", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/auth/session-cookie", () => ({ getSessionTokenFromCookie: mocks.getSessionTokenFromCookie }));

async function loadCurrentUser() {
  vi.resetModules();
  const [currentUser, errors] = await Promise.all([
    import("@/server/auth/current-user"),
    import("@/shared/errors/app-error"),
  ]);
  return { ...currentUser, AppError: errors.AppError };
}

describe("optional server current user", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.getSessionTokenFromCookie.mockReset();
  });

  it("returns null without a cookie", async () => {
    mocks.getSessionTokenFromCookie.mockResolvedValue(undefined);
    const { getOptionalCurrentUser } = await loadCurrentUser();
    await expect(getOptionalCurrentUser()).resolves.toBeNull();
  });

  it("turns invalid and expired session responses into anonymous users", async () => {
    mocks.getSessionTokenFromCookie.mockResolvedValue("token");
    const { AppError, getOptionalCurrentUser } = await loadCurrentUser();
    mocks.getCurrentUser.mockRejectedValue(new AppError("UNAUTHENTICATED", "Expired", 401));
    await expect(getOptionalCurrentUser()).resolves.toBeNull();
  });

  it("returns authenticated users and preserves unexpected failures", async () => {
    mocks.getSessionTokenFromCookie.mockResolvedValue("token");
    mocks.getCurrentUser.mockResolvedValue({ user: { id: "user-1" } });
    let loaded = await loadCurrentUser();
    await expect(loaded.getOptionalCurrentUser()).resolves.toEqual({ user: { id: "user-1" } });

    mocks.getCurrentUser.mockRejectedValue(new Error("database unavailable"));
    loaded = await loadCurrentUser();
    await expect(loaded.getOptionalCurrentUser()).rejects.toThrow("database unavailable");
  });
});
