import { NextResponse } from "next/server";

type ImageGenBody = {
  prompt: string;
  style?: "watercolor" | "realistic" | "cartoon" | "minimal" | "vintage" | "modern";
  format?: "cover" | "illustration" | "page" | "back-cover";
  title?: string;
  language?: string;
};

const STYLE_PROMPTS: Record<string, string> = {
  watercolor: "soft watercolor illustration style, gentle brush strokes, pastel colors",
  realistic: "photorealistic style, detailed, professional lighting, high quality",
  cartoon: "cartoon illustration style, bold outlines, vibrant colors, playful",
  minimal: "minimalist design, clean lines, simple shapes, elegant typography",
  vintage: "vintage retro style, aged paper texture, classic typography, muted tones",
  modern: "modern graphic design, bold geometric shapes, contemporary typography"
};

const FORMAT_PROMPTS: Record<string, string> = {
  cover: "full book cover design, portrait orientation 6:9 ratio, with title text and author name, professional KDP book cover",
  illustration: "interior book illustration, landscape orientation, no text, suitable for children book or guide",
  page: "decorative book page design with ornamental borders, suitable for chapter opener",
  "back-cover": "book back cover design with blurb text area, barcode placeholder, portrait orientation 6:9 ratio"
};

export async function POST(request: Request) {
  const body = (await request.json()) as ImageGenBody;
  const { prompt, style = "watercolor", format = "cover", title, language = "en" } = body;

  if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  const fullPrompt = `${prompt}. ${STYLE_PROMPTS[style]}. ${FORMAT_PROMPTS[format]}. ${title ? `Title: "${title}".` : ""} Language: ${language}.`;

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
        }),
        cache: "no-store"
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message ?? "Gemini image generation failed" }, { status: res.status });
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];

    let imageBase64 = "";
    let textResponse = "";
    for (const part of parts) {
      if (part.inlineData?.data) imageBase64 = part.inlineData.data;
      if (part.text) textResponse = part.text;
    }

    if (!imageBase64) {
      return NextResponse.json({ error: "No image returned", textResponse }, { status: 500 });
    }

    return NextResponse.json({
      executedAt: new Date().toISOString(),
      provider: "Google Gemini (Nano Banana)",
      prompt: fullPrompt,
      style,
      format,
      data: {
        imageBase64,
        mimeType: "image/png",
        textResponse
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
