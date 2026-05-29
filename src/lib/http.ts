import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorResponse(error: unknown): NextResponse {
  const includeDetails = !(
    process.env.VERCEL_ENV === "production" ||
    process.env.WORLD_ID_ENVIRONMENT === "production" ||
    process.env.NEXT_PUBLIC_APP_URL === "https://veripost.io"
  );

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Request payload is invalid.",
          ...(includeDetails ? { details: error.issues } : {}),
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(includeDetails ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  console.error(error);
  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message: "Something went wrong while handling this request.",
      },
    },
    { status: 500 },
  );
}
