import { AppError } from "@/shared/errors/app-error";

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configuredUrl = process.env.APP_URL;
  let allowedOrigin: string;
  try { allowedOrigin = new URL(configuredUrl ?? "").origin; } catch {
    throw new AppError("CONFIGURATION_ERROR", "Application URL is not configured.", 503);
  }
  if (!origin || origin !== allowedOrigin) {
    throw new AppError("FORBIDDEN", "This request is not permitted.", 403);
  }
}
