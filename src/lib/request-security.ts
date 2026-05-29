import { ApiError } from "@/lib/http";

export function assertSameOriginRequest(request: Request): void {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return;

  let origin: string;
  try {
    origin = new URL(originHeader).origin;
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

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
