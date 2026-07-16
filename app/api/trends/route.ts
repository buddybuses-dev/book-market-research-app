import { NextResponse } from "next/server";
import { checkAppSecret } from "@/lib/api-auth";
import { generateTrendData, logApiCall } from "@/lib/api-utils";
import type { TrendData } from "@/lib/api-utils";

export async function GET(request: Request) {
  const authError = checkAppSecret(request);

  if (authError) {
    return authError;
  }

  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche");
    const daysParam = searchParams.get("days") || "7";
    const days = Math.max(1, parseInt(daysParam, 10));

    if (!niche) {
      logApiCall("/api/trends", { niche: null }, "error");
      return NextResponse.json(
        { error: "niche parameter is required" },
        { status: 400 }
      );
    }

    // Generate trend data
    const trendData: TrendData = generateTrendData(niche);

    logApiCall("/api/trends", { niche, days }, "success", trendData);

    return NextResponse.json(trendData, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=3600"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logApiCall("/api/trends", {}, "error", errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
