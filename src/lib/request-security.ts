import { ApiError } from "@/lib/http";
import { isProductionLaunchRuntime } from "@/lib/config";

export function assertSameOriginRequest(request: Request): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new ApiError(403, "invalid_origin", "The request origin is not accepted.");
  }

  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");
  if (!originHeader && !refererHeader) {
    if (isProductionLaunchRuntime()) {
      throw new ApiError(403, "missing_origin", "The request origin is required.");
    }

    return;
  }

  let origin: string;
  try {
    origin = new URL(originHeader ?? refererHeader ?? "").origin;
  } catch {
    throw new ApiError(403, "invalid_origin", "The request origin is not accepted.");
  }

  const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : new URL(request.url).origin;

  if (origin !== expectedOrigin) {
    throw new ApiError(403, "invalid_origin", "The request origin is not accepted.");
  }
}

export function assertJsonRequest(request: Request, maxBytes: number): void {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Request body must be JSON.");
  }

  const contentLength = request.headers.get("content-length");
  if (!contentLength) return;

  const parsedLength = Number(contentLength);
  if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
    throw new ApiError(400, "invalid_content_length", "Request content length is invalid.");
  }

  if (parsedLength > maxBytes) {
    throw new ApiError(413, "request_too_large", "Request body is too large.");
  }
}

export function getClientIp(request: Request): string {
  const forwardedFor = normalizeClientIp(request.headers.get("x-forwarded-for")?.split(",")[0]);
  if (forwardedFor) return forwardedFor;

  return normalizeClientIp(request.headers.get("x-real-ip")) || "unknown";
}

function normalizeClientIp(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 128) return null;
  return normalized;
}
