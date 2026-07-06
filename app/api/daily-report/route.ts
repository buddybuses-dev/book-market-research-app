import { NextResponse } from "next/server";
import { generateDailyReportData, logApiCall } from "@/lib/api-utils";
import type { DailyReportItem } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nichesParam = searchParams.get("niches");
    const format = searchParams.get("format") || "json";

    if (!nichesParam) {
      logApiCall("/api/daily-report", { niches: null }, "error");
      return NextResponse.json(
        { error: "niches parameter is required (comma-separated)" },
        { status: 400 }
      );
    }

    const niches = nichesParam.split(",").map((n) => n.trim());

    // Generate report data
    const reportData: DailyReportItem[] = generateDailyReportData(niches);

    logApiCall("/api/daily-report", { niches, format }, "success", reportData);

    return NextResponse.json(reportData, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=3600"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logApiCall("/api/daily-report", {}, "error", errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
