import { NextResponse } from "next/server";

import { processEnv } from "@/lib/env";

export const APP_SECRET_HEADER_NAME = "X-App-Secret";

export function checkAppSecret(request: Request) {
  const expected = processEnv.APP_API_SECRET?.trim();

  if (!expected) {
    return null;
  }

  const provided = request.headers.get(APP_SECRET_HEADER_NAME);

  if (provided !== expected) {
    return NextResponse.json(
      { error: `Missing or invalid ${APP_SECRET_HEADER_NAME} header.` },
      { status: 401 }
    );
  }

  return null;
}
