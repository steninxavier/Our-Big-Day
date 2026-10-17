import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  createOpaqueToken: vi.fn(),
  hashOpaqueToken: vi.fn((token: string) => `hash:${token}`),
  hash: vi.fn(),
  compare: vi.fn(),
  userExists: vi.fn(),
  userCreate: vi.fn(),
  userFindOneExec: vi.fn(),
  userFindByIdExec: vi.fn(),
  sessionCreate: vi.fn(),
  sessionDeleteOne: vi.fn(),
  sessionFindOneExec: vi.fn(),
  membershipExists: vi.fn(),
  membershipFindOneExec: vi.fn(),
  weddingFindByIdExec: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ default: { hash: mocks.hash, compare: mocks.compare } }));
vi.mock("@/server/db/mongoose", () => ({ connectToDatabase: mocks.connectToDatabase }));
vi.mock("@/server/auth/tokens", () => ({ createOpaqueToken: mocks.createOpaqueToken, hashOpaqueToken: mocks.hashOpaqueToken }));
vi.mock("@/modules/auth/models/user.model", () => ({
  UserModel: {
    exists: mocks.userExists,
    create: mocks.userCreate,
    findOne: vi.fn(() => ({ select: vi.fn(() => ({ exec: mocks.userFindOneExec })) })),
    findById: vi.fn(() => ({ exec: mocks.userFindByIdExec })),
  },
}));
vi.mock("@/modules/auth/models/session.model", () => ({
  SessionModel: {
    create: mocks.sessionCreate,
    deleteOne: mocks.sessionDeleteOne,
    findOne: vi.fn(() => ({ exec: mocks.sessionFindOneExec })),
  },
}));
vi.mock("@/modules/members/models/wedding-membership.model", () => ({
  WeddingMembershipModel: {
    exists: mocks.membershipExists,
    findOne: vi.fn(() => ({ exec: mocks.membershipFindOneExec })),
  },
}));
vi.mock("@/modules/weddings/models/wedding.model", () => ({
  WeddingModel: { findById: vi.fn(() => ({ exec: mocks.weddingFindByIdExec })) },
}));

import { getCurrentUser, login, logout, signUp } from "@/modules/auth/auth.service";

const input = { name: "Liya", email: "Liya@example.com", password: "password1" };
const user = { _id: { toString: () => "user-1" }, name: "Liya John", email: "liya@example.com", passwordHash: "stored-hash" };

function resetMocks() {
  for (const mock of Object.values(mocks)) {
    if ("mockReset" in mock) mock.mockReset();
  }
  mocks.connectToDatabase.mockResolvedValue(undefined);
  mocks.createOpaqueToken.mockReturnValue("session-token");
  mocks.hashOpaqueToken.mockImplementation((token: string) => `hash:${token}`);
}

describe("authentication service", () => {
  beforeEach(resetMocks);

  it("creates an account, hashed password, and server session", async () => {
    mocks.userExists.mockResolvedValue(false);
    mocks.hash.mockResolvedValue("bcrypt-hash");
    mocks.userCreate.mockResolvedValue(user);
    mocks.sessionCreate.mockResolvedValue({});

    await expect(signUp(input)).resolves.toEqual({
      user: { id: "user-1", name: "Liya John", email: "liya@example.com" },
      hasWedding: false,
      sessionToken: "session-token",
    });
    expect(mocks.userCreate).toHaveBeenCalledWith({
      name: "Liya",
      email: "Liya@example.com",
      emailNormalized: "liya@example.com",
      passwordHash: "bcrypt-hash",
    });
    expect(mocks.sessionCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", tokenHash: "hash:session-token", expiresAt: expect.any(Date) }));
  });

  it("rejects known and racing duplicate accounts but preserves other errors", async () => {
    mocks.userExists.mockResolvedValue(true);
    await expect(signUp(input)).rejects.toMatchObject({ code: "CONFLICT", status: 409 });

    mocks.userExists.mockResolvedValue(false);
    mocks.hash.mockResolvedValue("bcrypt-hash");
    mocks.userCreate.mockRejectedValue({ code: 11000 });
    await expect(signUp(input)).rejects.toMatchObject({ code: "CONFLICT", status: 409 });

    const failure = new Error("write failed");
    mocks.userCreate.mockRejectedValue(failure);
    await expect(signUp(input)).rejects.toBe(failure);
  });

  it("logs in only valid credentials and reports membership state", async () => {
    mocks.userFindOneExec.mockResolvedValue(undefined);
    await expect(login({ email: "liya@example.com", password: "password1" })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });

    mocks.userFindOneExec.mockResolvedValue(user);
    mocks.compare.mockResolvedValue(false);
    await expect(login({ email: "liya@example.com", password: "password1" })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });

    mocks.compare.mockResolvedValue(true);
    mocks.membershipExists.mockResolvedValue(null);
    mocks.sessionCreate.mockResolvedValue({});
    await expect(login({ email: "LIYA@EXAMPLE.COM", password: "password1" })).resolves.toMatchObject({ hasWedding: false, sessionToken: "session-token" });

    mocks.membershipExists.mockResolvedValue({ _id: "membership" });
    await expect(login({ email: "liya@example.com", password: "password1" })).resolves.toMatchObject({ hasWedding: true });
  });

  it("logs out an existing token and rejects a missing token", async () => {
    await expect(logout(undefined)).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    await logout("session-token");
    expect(mocks.sessionDeleteOne).toHaveBeenCalledWith({ tokenHash: "hash:session-token" });
  });

  it("resolves the current user only with an active session, user, membership, and wedding", async () => {
    await expect(getCurrentUser(undefined)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });

    mocks.sessionFindOneExec.mockResolvedValue(undefined);
    await expect(getCurrentUser("token")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });

    mocks.sessionFindOneExec.mockResolvedValue({ userId: "user-1" });
    mocks.userFindByIdExec.mockResolvedValue(undefined);
    await expect(getCurrentUser("token")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });

    mocks.userFindByIdExec.mockResolvedValue(user);
    mocks.membershipFindOneExec.mockResolvedValue(undefined);
    await expect(getCurrentUser("token")).resolves.toEqual({
      user: { id: "user-1", name: "Liya John", email: "liya@example.com" },
      membership: null,
      wedding: null,
    });

    mocks.membershipFindOneExec.mockResolvedValue({ _id: { toString: () => "membership-1" }, role: "ADMIN", weddingId: "wedding-1" });
    mocks.weddingFindByIdExec.mockResolvedValue({ deletedAt: new Date() });
    await expect(getCurrentUser("token")).resolves.toMatchObject({ membership: null, wedding: null });

    mocks.weddingFindByIdExec.mockResolvedValue({
      _id: { toString: () => "wedding-1" },
      brideName: "Liya",
      groomName: "John",
      weddingDate: "2027-02-14",
    });
    await expect(getCurrentUser("token")).resolves.toEqual({
      user: { id: "user-1", name: "Liya John", email: "liya@example.com" },
      membership: { id: "membership-1", role: "ADMIN" },
      wedding: { id: "wedding-1", brideName: "Liya", groomName: "John", weddingDate: "2027-02-14" },
    });
  });
});
