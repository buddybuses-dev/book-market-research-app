import { NextResponse } from "next/server";
import { generateKeywordsForBook, logApiCall } from "@/lib/api-utils";
import type { KeywordForBook } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche");
    const format = searchParams.get("format") || "json";
    const targetAudience = searchParams.get("target_audience") || "general";

    if (!niche) {
      logApiCall("/api/keywords-for-book", { niche: null }, "error");
      return NextResponse.json(
        { error: "niche parameter is required" },
        { status: 400 }
      );
    }

    // Generate keywords
    const keywords: KeywordForBook[] = generateKeywordsForBook(niche, targetAudience);

    logApiCall("/api/keywords-for-book", { niche, format, targetAudience }, "success", keywords);

    return NextResponse.json(keywords, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=3600"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logApiCall("/api/keywords-for-book", {}, "error", errorMessage);

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
