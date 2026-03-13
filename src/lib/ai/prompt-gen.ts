import { z } from "zod";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-flash";

export const GeneratedPromptSchema = z.object({
  content: z.string(),
  intentCategory: z.enum(['informational', 'commercial', 'transactional']),
  suggestedCategory: z.string().optional(),
});

export const GenerationResponseSchema = z.array(GeneratedPromptSchema);

export type GeneratedPrompt = z.infer<typeof GeneratedPromptSchema>;

/**
 * 根据核心关键词、国家和分类生成 Localized GEO 问题。
 */
export async function generateLocalizedPrompts({
  keyword,
  country,
  category,
}: {
  keyword: string;
  country: string;
  category: string;
}) {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const countryName = getCountryName(country);

  // 第一阶段：关键词扩展
  const expansionPrompt = `
    You are an SEO and GEO (Generative Engine Optimization) expert.
    Expand the following seed keyword into 10-15 semantically related keywords or search queries that users might use in ${countryName}.
    Focus on the "${category}" niche.
    
    Seed Keyword: ${keyword}
    
    Return ONLY a comma-separated list of keywords.
  `;

  const expansionResult = await callGemini(expansionPrompt, countryName);
  const expandedKeywords = expansionResult.split(',').map(k => k.trim());

  // 第二阶段：意图引导生成
  const generationPrompt = `
    You are an AI specialized in GEO (Generative Engine Optimization) and Content Strategy.
    Based on the following expanded keywords related to "${keyword}" in ${countryName} and the category "${category}":
    Keywords: ${expandedKeywords.join(', ')}
    
    Generate 10-15 localized questions or search prompts that cover different stages of the marketing funnel:
    - Awareness (informational): Questions about "what is", "how to", "why does". Users are looking for information.
    - Consideration (commercial): Questions comparing products, asking for "best...", "vs...", "features of...". Users are comparing options.
    - Conversion (transactional): Questions about "reviews of...", "price of...", "where to buy...", "discount code for...". Users are ready to act.
    
    Requirements:
    1. Ensure the questions are localized and naturally phrased for a user in ${countryName}.
    2. Respond in the primary language used in ${countryName} if appropriate (e.g., Chinese for CN, Japanese for JP).
    3. The questions should be high-value queries that are likely to trigger AI-generated responses (like AI Overviews).
    
    Output the result as a JSON array of objects.
    Structure:
    [
      {
        "content": "The question or prompt",
        "intentCategory": "informational" | "commercial" | "transactional",
        "suggestedCategory": "${category}"
      }
    ]
  `;

  const generationResult = await callGemini(generationPrompt, countryName, true);
  
  try {
    const jsonStr = extractJson(generationResult);
    const parsed = GenerationResponseSchema.parse(JSON.parse(jsonStr));
    return parsed;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    console.debug("Raw result:", generationResult);
    throw new Error("Failed to generate structured prompts from AI. Please try again.");
  }
}

async function callGemini(prompt: string, countryName: string, isJson: boolean = false) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  
  const systemInstruction = `Assume the user is located in ${countryName}. Your responses should reflect local context, search trends, and provide insights that are relevant to this geographic location. Ensure that the response follows local standards and nuances as if the user were physically present there.`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        ...(isJson ? { response_mime_type: "application/json" } : {})
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function extractJson(text: string): string {
  const match = text.match(/\[[\s\S]*\]/);
  return match ? match[0] : text;
}

function getCountryName(countryCode: string): string {
  const countries: Record<string, string> = {
    US: "the United States",
    CN: "China",
    GB: "the United Kingdom",
    DE: "Germany",
    FR: "France",
    JP: "Japan",
    KR: "South Korea",
    IN: "India",
    BR: "Brazil",
    RU: "Russia",
    CA: "Canada",
    AU: "Australia",
    SG: "Singapore",
    AE: "United Arab Emirates",
  };
  return countries[countryCode.toUpperCase()] || countryCode;
}
