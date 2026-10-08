import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/shared/errors/app-error";

export function dataResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function successResponse(init?: ResponseInit) {
  return NextResponse.json({ success: true }, init);
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "One or more fields are invalid.",
          details: error.issues,
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      },
      { status: error.status },
    );
  }

  console.error("Unhandled route error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
    { status: 500 },
  );
}

export async function handleRoute(handler: () => Promise<NextResponse>) {
  try {
    return await handler();
  } catch (error) {
    return errorResponse(error);
  }
}
