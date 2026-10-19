import { z } from "zod";

import { AppError } from "@/shared/errors/app-error";

export async function parseJson<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  }

  return schema.parse(body);
}

// Public endpoints must bound the body while streaming, even without Content-Length.
export async function parseSmallJson<TSchema extends z.ZodType>(request: Request, schema: TSchema, maximumBytes = 8192): Promise<z.output<TSchema>> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maximumBytes) throw new AppError("VALIDATION_ERROR", "Request body is too large.", 413);
  if (!request.body) throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) { await reader.cancel(); throw new AppError("VALIDATION_ERROR", "Request body is too large.", 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.", 400); }
  return schema.parse(body);
}
