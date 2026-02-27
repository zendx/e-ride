import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    { error: { code: "internal_error", message: "Internal server error" } },
    { status: 500 }
  );
}
