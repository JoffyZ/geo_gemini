import { NextRequest, NextResponse } from "next/server";
import { getTenantId } from "@/lib/auth";
import { generateLocalizedPrompts } from "@/lib/ai/prompt-gen";

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { keyword, country, category } = body;

    if (!keyword || !country || !category) {
      return NextResponse.json(
        { error: "Missing required parameters: keyword, country, or category" },
        { status: 400 }
      );
    }

    const prompts = await generateLocalizedPrompts({
      keyword,
      country,
      category,
    });

    return NextResponse.json({ prompts });
  } catch (error: any) {
    console.error("[GENERATE_PROMPTS_API_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
