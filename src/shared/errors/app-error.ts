export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "ALREADY_HAS_WEDDING"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthenticated = () =>
  new AppError("UNAUTHENTICATED", "Authentication is required.", 401);

export const invalidCredentials = () =>
  new AppError("UNAUTHENTICATED", "Invalid email or password.", 401);
