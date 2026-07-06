import { NextResponse } from "next/server";
import { generateCompetitorData, logApiCall } from "@/lib/api-utils";
import type { CompetitorItem } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche");
    const format = searchParams.get("format") || "json";

    if (!niche) {
      logApiCall("/api/competitors", { niche: null }, "error");
      return NextResponse.json(
        { error: "niche parameter is required" },
        { status: 400 }
      );
    }

    // Generate competitor data
    const competitors: CompetitorItem[] = generateCompetitorData(niche);

    logApiCall("/api/competitors", { niche, format }, "success", competitors);

    return NextResponse.json(competitors, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=7200"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logApiCall("/api/competitors", {}, "error", errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
