import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { AppError } from "./errors";

// ── Standard success response ──
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

// ── Standard error response ──
export function error(message: string, status = 500, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

// ── Parse and validate JSON request body ──
export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

// ── Wrap route handler with error handling ──
export function withErrorHandler(
  handler: (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: Record<string, string> }) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return error(
          "Validation failed",
          400,
          err.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        );
      }
      if (err instanceof AppError) {
        return error(err.message, err.statusCode);
      }
      console.error("Unhandled route error:", err);
      return error("Internal server error", 500);
    }
  };
}
