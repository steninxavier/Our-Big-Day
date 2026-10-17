import { beforeEach, describe, expect, it, vi } from "vitest";

const mongooseMock = vi.hoisted(() => {
  class ServerSelectionError extends Error {}

  return {
    connect: vi.fn(),
    ServerSelectionError,
  };
});

vi.mock("mongoose", () => ({
  default: {
    connect: mongooseMock.connect,
    Error: { MongooseServerSelectionError: mongooseMock.ServerSelectionError },
  },
}));

async function loadConnectionModule() {
  delete (globalThis as typeof globalThis & { mongooseCache?: unknown }).mongooseCache;
  vi.resetModules();
  return import("@/server/db/mongoose");
}

async function loadConnectionModuleWithCache(cache: { connection: unknown; promise: Promise<unknown> | null }) {
  (globalThis as typeof globalThis & { mongooseCache?: unknown }).mongooseCache = cache;
  vi.resetModules();
  return import("@/server/db/mongoose");
}

describe("Mongoose connection manager", () => {
  beforeEach(() => {
    mongooseMock.connect.mockReset();
    vi.stubEnv("MONGODB_URI", "mongodb://example.test/our-big-day");
  });

  it("fails clearly when no connection string is configured", async () => {
    vi.stubEnv("MONGODB_URI", "");
    const { connectToDatabase } = await loadConnectionModule();
    await expect(connectToDatabase()).rejects.toMatchObject({ code: "CONFIGURATION_ERROR", status: 500 });
  });

  it("reuses an established connection", async () => {
    const connection = { connection: { readyState: 1 } };
    mongooseMock.connect.mockResolvedValue(connection);
    const { connectToDatabase } = await loadConnectionModule();
    await expect(connectToDatabase()).resolves.toBe(connection);
    await expect(connectToDatabase()).resolves.toBe(connection);
    expect(mongooseMock.connect).toHaveBeenCalledTimes(1);
    expect(mongooseMock.connect).toHaveBeenCalledWith("mongodb://example.test/our-big-day", { serverSelectionTimeoutMS: 10_000 });
  });

  it("waits for an existing in-flight connection instead of opening another one", async () => {
    const connection = { connection: { readyState: 1 } };
    const { connectToDatabase } = await loadConnectionModuleWithCache({
      connection: null,
      promise: Promise.resolve(connection),
    });

    await expect(connectToDatabase()).resolves.toBe(connection);
    expect(mongooseMock.connect).not.toHaveBeenCalled();
  });

  it("maps server selection failures to retryable errors and retries after a failure", async () => {
    mongooseMock.connect.mockRejectedValue(new mongooseMock.ServerSelectionError("not allowlisted"));
    const { connectToDatabase } = await loadConnectionModule();
    await expect(connectToDatabase()).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", status: 503 });
    await expect(connectToDatabase()).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", status: 503 });
    expect(mongooseMock.connect).toHaveBeenCalledTimes(2);
  });

  it("preserves unexpected database errors while clearing the failed promise", async () => {
    const failure = new Error("driver failure");
    mongooseMock.connect.mockRejectedValue(failure);
    const { connectToDatabase } = await loadConnectionModule();
    await expect(connectToDatabase()).rejects.toBe(failure);
    await expect(connectToDatabase()).rejects.toBe(failure);
    expect(mongooseMock.connect).toHaveBeenCalledTimes(2);
  });
});
