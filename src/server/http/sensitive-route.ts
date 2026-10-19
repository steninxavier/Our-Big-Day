import { ZodError } from "zod";
import { AppError } from "@/shared/errors/app-error";
import { errorResponse } from "@/shared/http/response";
import type { NextResponse } from "next/server";

// Database errors can contain bearer tokens in their query. Never log their details.
export async function handleSensitiveRoute(handler: () => Promise<NextResponse>) {
  try { return await handler(); } catch (error) {
    if (error instanceof AppError || error instanceof ZodError) return errorResponse(error);
    console.error("Guest invitation request failed.");
    return errorResponse(new AppError("INTERNAL_ERROR", "Something went wrong.", 500));
  }
}
