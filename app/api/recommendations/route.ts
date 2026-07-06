import { NextResponse } from "next/server";
import { generateRecommendations, logApiCall } from "@/lib/api-utils";
import type { Recommendation } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "Kindle";
    const limitParam = searchParams.get("limit") || "3";
    const limit = Math.max(1, parseInt(limitParam, 10));

    // Validate format
    const validFormats = ["Kindle", "Paperback", "Audiobook"];
    if (!validFormats.includes(format)) {
      logApiCall("/api/recommendations", { format }, "error");
      return NextResponse.json(
        { error: `format must be one of: ${validFormats.join(", ")}` },
        { status: 400 }
      );
    }

    // Generate recommendations
    const recommendations: Recommendation[] = generateRecommendations(format, limit);

    logApiCall("/api/recommendations", { format, limit }, "success", recommendations);

    return NextResponse.json(recommendations, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=3600"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logApiCall("/api/recommendations", {}, "error", errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
