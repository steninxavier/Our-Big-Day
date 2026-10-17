import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AppError } from "@/shared/errors/app-error";
import { parseJson } from "@/shared/http/request";
import { dataResponse, errorResponse, handleRoute, successResponse } from "@/shared/http/response";

async function json(response: Response) {
  return response.json();
}

describe("HTTP request parsing", () => {
  it("parses a valid JSON body through Zod", async () => {
    await expect(parseJson(new Request("http://test", { method: "POST", body: '{"name":"Liya"}' }), z.object({ name: z.string() }))).resolves.toEqual({ name: "Liya" });
  });

  it("maps malformed JSON and invalid payloads to validation errors", async () => {
    await expect(parseJson(new Request("http://test", { method: "POST", body: "{" }), z.object({ name: z.string() }))).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    await expect(parseJson(new Request("http://test", { method: "POST", body: '{}' }), z.object({ name: z.string() }))).rejects.toBeInstanceOf(z.ZodError);
  });
});

describe("HTTP responses", () => {
  it("creates success and data envelopes", async () => {
    expect(await json(dataResponse({ id: "one" }, { status: 201 }))).toEqual({ data: { id: "one" } });
    expect(dataResponse({ id: "one" }, { status: 201 }).status).toBe(201);
    expect(await json(successResponse())).toEqual({ success: true });
  });

  it("maps Zod, application, and unknown errors", async () => {
    const zodResponse = errorResponse(new z.ZodError([{ code: "custom", path: ["email"], message: "Bad input" }]));
    expect(zodResponse.status).toBe(400);
    expect((await json(zodResponse)).error.code).toBe("VALIDATION_ERROR");

    const appResponse = errorResponse(new AppError("CONFLICT", "Exists", 409, { field: "email" }));
    expect(await json(appResponse)).toEqual({ error: { code: "CONFLICT", message: "Exists", details: { field: "email" } } });
    expect(await json(errorResponse(new AppError("UNAUTHENTICATED", "No", 401)))).toEqual({ error: { code: "UNAUTHENTICATED", message: "No" } });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unknownResponse = errorResponse(new Error("Unexpected"));
    expect(unknownResponse.status).toBe(500);
    expect(await json(unknownResponse)).toEqual({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("wraps asynchronous route handlers", async () => {
    expect(await json(await handleRoute(async () => successResponse()))).toEqual({ success: true });
    expect(await json(await handleRoute(async () => { throw new AppError("FORBIDDEN", "No", 403); }))).toEqual({ error: { code: "FORBIDDEN", message: "No" } });
  });
});
