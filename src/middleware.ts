import { NextRequest, NextResponse } from "next/server";

function resolveAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return "";

  const explicitlyAllowed = process.env.MOBILE_WEB_ORIGIN?.trim();
  if (explicitlyAllowed && origin === explicitlyAllowed) {
    return origin;
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin;
  }

  return "";
}

function appendCorsHeaders(response: NextResponse, request: NextRequest) {
  const allowedOrigin = resolveAllowedOrigin(request);
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
  return response;
}

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return appendCorsHeaders(new NextResponse(null, { status: 204 }), request);
  }

  return appendCorsHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: ["/api/:path*"]
};
