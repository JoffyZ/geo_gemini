import { NextRequest, NextResponse } from "next/server";
import { AdapterFactory } from "@/lib/adapters/factory";
import { parseAIResponse } from "@/lib/parser";

/**
 * API route for testing AI queries and parsing results.
 * POST /api/explorer
 * Body: { prompt: string, platform: string, countryCode: string }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { prompt, platform, countryCode } = await request.json();

    if (!prompt || !platform || !countryCode) {
      return NextResponse.json(
        { error: "Missing required fields: prompt, platform, countryCode" },
        { status: 400 }
      );
    }

    // 1. Query AI platform via adapter
    const adapter = AdapterFactory.getAdapter(platform);
    const { rawResponse } = await adapter.query(prompt, countryCode);

    // 2. Parse AI response into structured data
    const structuredData = await parseAIResponse(rawResponse, countryCode);

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      raw: rawResponse,
      structured: structuredData,
      executionTime,
    });
  } catch (error: any) {
    console.error("Explorer API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process query" },
      { status: 500 }
    );
  }
}
