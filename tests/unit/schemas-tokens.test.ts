import { describe, expect, it } from "vitest";

import {
  forgotPasswordSchema,
  loginSchema,
  MAX_PASSWORD_BYTES,
  resetPasswordSchema,
  signUpSchema,
} from "@/modules/auth/schemas";
import { createWeddingSchema } from "@/modules/weddings/schemas";
import { createOpaqueToken, hashOpaqueToken } from "@/server/auth/tokens";
import { AppError, invalidCredentials, unauthenticated } from "@/shared/errors/app-error";

describe("authentication schemas", () => {
  it("normalizes valid sign-up data and enforces bcrypt-safe passwords", () => {
    expect(signUpSchema.parse({ name: "  Liya John  ", email: " LIYA@EXAMPLE.COM ", password: "password1" })).toEqual({
      name: "Liya John",
      email: "liya@example.com",
      password: "password1",
    });
    expect(() => signUpSchema.parse({ name: "", email: "not-an-email", password: "short" })).toThrow();
    expect(() => signUpSchema.parse({ name: "Liya", email: "liya@example.com", password: "a".repeat(MAX_PASSWORD_BYTES + 1) })).toThrow();
    expect(() => signUpSchema.parse({ name: "Liya", email: "liya@example.com", password: "😀".repeat(19) })).toThrow();
    expect(() => signUpSchema.parse({ name: "x".repeat(121), email: "liya@example.com", password: "password1" })).toThrow();
    expect(() => signUpSchema.parse({ name: "Liya", email: `${"a".repeat(250)}@example.com`, password: "password1" })).toThrow();
  });

  it("validates login and password-reset request shapes", () => {
    expect(loginSchema.parse({ email: " JOHN@EXAMPLE.COM ", password: "x" })).toEqual({
      email: "john@example.com",
      password: "x",
    });
    expect(() => loginSchema.parse({ email: "john", password: "" })).toThrow();
    expect(() => loginSchema.parse({ email: "john@example.com", password: "😀".repeat(19) })).toThrow();
    expect(forgotPasswordSchema.parse({ email: " JOHN@EXAMPLE.COM " })).toEqual({ email: "john@example.com" });
    expect(() => forgotPasswordSchema.parse({ email: "bad" })).toThrow();
    expect(resetPasswordSchema.parse({ token: "token", password: "password1" })).toEqual({ token: "token", password: "password1" });
    expect(() => resetPasswordSchema.parse({ token: "", password: "password1" })).toThrow();
    expect(() => resetPasswordSchema.parse({ token: "x".repeat(513), password: "password1" })).toThrow();
  });
});

describe("wedding creation schema", () => {
  const input = {
    brideName: " Liya ",
    groomName: " John ",
    weddingDate: "2027-02-14",
    timeZone: "Asia/Kolkata",
    location: { city: " Kochi " },
  };

  it("accepts valid data and trims relevant fields", () => {
    expect(createWeddingSchema.parse(input)).toMatchObject({
      brideName: "Liya",
      groomName: "John",
      weddingDate: "2027-02-14",
      location: { city: "Kochi" },
    });
  });

  it("rejects invalid calendar dates, zones, and field limits", () => {
    expect(() => createWeddingSchema.parse({ ...input, weddingDate: "2027/02/14" })).toThrow();
    expect(() => createWeddingSchema.parse({ ...input, weddingDate: "2027-02-30" })).toThrow();
    expect(() => createWeddingSchema.parse({ ...input, timeZone: "Mars/Olympus" })).toThrow();
    expect(() => createWeddingSchema.parse({ ...input, brideName: "" })).toThrow();
    expect(() => createWeddingSchema.parse({ ...input, groomName: "x".repeat(121) })).toThrow();
    expect(() => createWeddingSchema.parse({ ...input, title: "x".repeat(181) })).toThrow();
    expect(() => createWeddingSchema.parse({ ...input, description: "x".repeat(2_001) })).toThrow();
    expect(() => createWeddingSchema.parse({ ...input, location: { city: "", latitude: 91, longitude: -181 } })).toThrow();
  });
});

describe("tokens and application errors", () => {
  it("creates high-entropy opaque tokens and deterministic hashes", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(hashOpaqueToken("example")).toBe(hashOpaqueToken("example"));
    expect(hashOpaqueToken("example")).not.toBe(hashOpaqueToken("different"));
  });

  it("constructs typed authentication errors", () => {
    expect(unauthenticated()).toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    expect(invalidCredentials()).toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    expect(new AppError("CONFLICT", "Already exists", 409, { field: "email" })).toMatchObject({
      name: "AppError",
      code: "CONFLICT",
      status: 409,
      details: { field: "email" },
    });
  });
});
